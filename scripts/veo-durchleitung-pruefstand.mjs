#!/usr/bin/env node
// Prüfstand Etappe 2: Veo über die Gemini-Durchleitung des LiteLLM-Gateways (ADR 0002).
//
// Misst genau den Weg, den das Studio mit Option a (Durchleitung) nehmen würde:
//   1. Spend des Schlüssels vorher (GET /key/info)
//   2. POST {GATEWAY}/gemini/v1beta/models/{modell}:predictLongRunning, Kopf x-goog-api-key
//   3. GET  {GATEWAY}/gemini/v1beta/{operationName} im Abstand von 5 s, bis done
//   4. Datei laden über {GATEWAY}/gemini/v1beta/files/...:download?alt=media
//   5. Spend des Schlüssels nachher, Differenz = verbuchte Kosten
// Liest MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY aus .env.local, druckt den Schlüssel nie.
// Bericht: docs/pruefstand/litellm/bericht-veo-durchleitung.md, Video daneben.
//
// Aufruf: node scripts/veo-durchleitung-pruefstand.mjs [--modell veo-3.1-lite-generate-preview] [--sekunden 4] [--sdk]
// --frames: nur SDK-Bein, mit Startbild und Endbild (Fast oder Standard, nur 8 s), Bilder aus docs/pruefstand/litellm.
// --nur-sdk nur das SDK-Bein. --sdk startet zusätzlich ein zweites Video über @google/genai mit httpOptions.baseUrl (so wie
//       app/api/generate-video/start es täte). Kostet ein zweites Video.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'pruefstand', 'litellm');
fs.mkdirSync(OUT, { recursive: true });

function ladeEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
ladeEnv();

const URL_ = (process.env.MODELL_GATEWAY_URL || '').replace(/\/+$/, '');
const KEY = process.env.MODELL_GATEWAY_KEY || '';
if (!URL_ || !KEY) {
  console.error('MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY fehlen (.env.local).');
  process.exit(2);
}
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const MODELL = arg('--modell', 'veo-3.1-lite-generate-preview');
const SEKUNDEN = Number(arg('--sekunden', args.includes('--frames') ? '8' : '4'));
const SDK = args.includes('--sdk') || args.includes('--nur-sdk') || args.includes('--frames');
const NUR_SDK = args.includes('--nur-sdk') || args.includes('--frames');
const FRAMES = args.includes('--frames');
const GEMINI = `${URL_}/gemini`;
const PROMPT = 'A paper boat drifting on a calm pond at golden hour, soft ripples, cinematic, shallow depth of field';

const bericht = [];
const log = (s = '') => { console.log(s); bericht.push(s); };
const kopfGoog = { 'x-goog-api-key': KEY };
const kopfBearer = { Authorization: `Bearer ${KEY}` };
const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));

function kostenKoepfe(res) {
  const o = {};
  for (const [k, v] of res.headers) if (k.startsWith('x-litellm')) o[k] = v;
  return o;
}

async function spend() {
  // Ein virtueller Schlüssel darf seine eigenen Daten lesen.
  const r = await fetch(`${URL_}/key/info`, { headers: kopfBearer });
  if (!r.ok) return { status: r.status, spend: null };
  const j = await r.json();
  const info = j.info || j;
  return { status: r.status, spend: info.spend ?? null, budget: info.max_budget ?? null, modelle: info.models ?? null };
}

async function starteREST() {
  log(`\n## 2. Start über REST: POST /gemini/v1beta/models/${MODELL}:predictLongRunning`);
  const body = {
    instances: [{ prompt: PROMPT }],
    parameters: { aspectRatio: '16:9', durationSeconds: SEKUNDEN },
  };
  const t = Date.now();
  const res = await fetch(`${GEMINI}/v1beta/models/${MODELL}:predictLongRunning`, {
    method: 'POST', headers: { ...kopfGoog, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const txt = await res.text();
  const kk = kostenKoepfe(res);
  log(`-> ${res.status} in ${Date.now() - t} ms`);
  log(`LiteLLM-Köpfe: ${Object.keys(kk).length ? JSON.stringify(kk) : 'keine'}`);
  let j; try { j = JSON.parse(txt); } catch { log(`Antwort (kein JSON): ${txt.slice(0, 300)}`); return null; }
  if (!res.ok) { log(`Fehler: ${JSON.stringify(j).slice(0, 400)}`); return null; }
  log(`operationName: ${j.name}`);
  return j.name;
}

async function warte(opName) {
  log(`\n## 3. Operation abfragen: GET /gemini/v1beta/${opName}`);
  const t0 = Date.now();
  let n = 0, erster403 = null;
  while (Date.now() - t0 < 300_000) {
    await schlafe(n === 0 ? 8000 : 5000);
    n++;
    const res = await fetch(`${GEMINI}/v1beta/${opName}`, { headers: kopfGoog });
    const txt = await res.text();
    const s = Math.round((Date.now() - t0) / 1000);
    if (!res.ok) {
      log(`  Abruf ${n} nach ${s} s: ${res.status} ${txt.replace(/\s+/g, ' ').slice(0, 160)}`);
      if (res.status === 403 && erster403 === null) erster403 = n;
      if (res.status >= 500 || res.status === 403 || res.status === 429) continue;
      return null;
    }
    const j = JSON.parse(txt);
    const kk = kostenKoepfe(res);
    log(`  Abruf ${n} nach ${s} s: 200, done=${!!j.done}${Object.keys(kk).length ? ' | ' + JSON.stringify(kk) : ''}`);
    if (j.done) {
      if (j.error) { log(`  Fehler in der Operation: ${JSON.stringify(j.error).slice(0, 300)}`); return null; }
      const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
        || j.response?.generatedVideos?.[0]?.video?.uri;
      log(`  Video-URI (Google): ${uri}`);
      if (erster403 !== null) log(`  Hinweis: einmaliger 403 beim Abruf ${erster403}, danach normal.`);
      log(`  Antwortform: ${j.response?.generateVideoResponse ? 'generateVideoResponse.generatedSamples' : 'generatedVideos'}`);
      return { uri, sekunden: s };
    }
  }
  log('  Abbruch: nach 300 s nicht fertig.');
  return null;
}

async function lade(uri, tag) {
  log(`\n## 4. Datei laden`);
  // Google liefert https://generativelanguage.googleapis.com/v1beta/files/<id>:download?alt=media
  // Das Studio darf keinen Google-Schlüssel haben, also muss der Download über den Gateway gehen.
  const pfadTeil = uri.replace(/^https:\/\/generativelanguage\.googleapis\.com\//, '');
  const versuche = [
    ['Gateway, Kopf x-goog-api-key', `${GEMINI}/${pfadTeil}`, kopfGoog],
    ['Gateway, ?key=', `${GEMINI}/${pfadTeil}${pfadTeil.includes('?') ? '&' : '?'}key=${KEY}`, {}],
    ['Google direkt ohne Schlüssel (Gegenprobe)', uri, {}],
  ];
  let datei = null;
  for (const [name, u, h] of versuche) {
    const t = Date.now();
    const res = await fetch(u, { headers: h, redirect: 'follow' });
    const ct = res.headers.get('content-type') || '';
    const kk = kostenKoepfe(res);
    if (res.ok && ct.startsWith('video/')) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (!datei) { datei = path.join(OUT, `${tag}.mp4`); fs.writeFileSync(datei, buf); }
      log(`${name}: ${res.status} ${ct}, ${(buf.length / 1e6).toFixed(1)} MB in ${Date.now() - t} ms${Object.keys(kk).length ? ' | ' + JSON.stringify(kk) : ''}`);
    } else {
      const txt = await res.text();
      log(`${name}: ${res.status} ${ct} | ${txt.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
  }
  return datei;
}

async function starteSDK() {
  log(`\n## 6. Zweiter Start über @google/genai mit httpOptions.baseUrl (so wie die Studio-Route)`);
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: KEY, httpOptions: { baseUrl: GEMINI } });
  const t = Date.now();
  let image, lastFrame;
  if (FRAMES) {
    const b = (f) => fs.readFileSync(path.join(OUT, f)).toString('base64');
    image = { imageBytes: b('flare-medium-1536x1024.png'), mimeType: 'image/png' };
    lastFrame = { imageBytes: b('flare-medium-2048x1152.png'), mimeType: 'image/png' };
    // Google nimmt Start+Endbild nur mit 8 s an (4 und 6 s: 400 „use case not supported“, gemessen 15.10.)
    log(`Startbild flare-medium-1536x1024.png (${(image.imageBytes.length * 0.75 / 1e6).toFixed(1)} MB), Endbild flare-medium-2048x1152.png (${(lastFrame.imageBytes.length * 0.75 / 1e6).toFixed(1)} MB), Modell ${MODELL}`);
  }
  try {
    const op = await ai.models.generateVideos({
      model: MODELL, prompt: FRAMES ? 'Slow push-in, the lighthouse keeper lowers the letter and looks up toward the light' : PROMPT,
      ...(image ? { image } : {}),
      config: { aspectRatio: FRAMES ? '16:9' : '9:16', durationSeconds: SEKUNDEN, numberOfVideos: 1, ...(lastFrame ? { lastFrame } : {}) },
    });
    log(`-> Operation ${op.name} in ${Date.now() - t} ms`);
    return op.name;
  } catch (e) {
    log(`-> Fehler: ${String(e.message).slice(0, 400)}`);
    return null;
  }
}

(async () => {
  log(`# Prüfstand Veo über Gemini-Durchleitung, ${new Date().toISOString().slice(0, 16)} gegen ${GEMINI}`);
  log(`Modell ${MODELL}, ${SEKUNDEN} s, 16:9, Textprompt.`);
  log(`\n## 1. Spend des Schlüssels vorher`);
  const vor = await spend();
  log(`GET /key/info -> ${vor.status} | spend ${vor.spend ?? '–'} $ | Budget ${vor.budget ?? '–'} | Modelle ${JSON.stringify(vor.modelle)}`);

  const op = NUR_SDK ? null : await starteREST();
  if (!op && !NUR_SDK) { fertig(); return; }
  let erg = null, datei = null;
  if (op) {
    erg = await warte(op);
    if (erg?.uri) datei = await lade(erg.uri, `veo-lite-${SEKUNDEN}s-durchleitung`);
  }

  log(`\n## 5. Spend des Schlüssels nachher`);
  const nach = await spend();
  log(`spend ${nach.spend ?? '–'} $ | Differenz zu vorher ${diff(vor.spend, nach.spend)} | erwartet bei ${SEKUNDEN} s Lite (0,05 $/s): ${(SEKUNDEN * 0.05).toFixed(2)} $`);
  log(`Video: ${datei ? path.relative(ROOT, datei) : 'nicht geladen'} | Dauer bis fertig: ${erg?.sekunden ?? '–'} s`);
  // LiteLLM schreibt Spend gebündelt in die Datenbank (etwa alle 10 s). Zweite Lesung nach 30 s.
  await schlafe(30_000);
  const nach30 = await spend();
  log(`spend nach weiteren 30 s: ${nach30.spend ?? '–'} $ | Differenz zu vorher ${diff(vor.spend, nach30.spend)}`);

  if (SDK) {
    const op2 = await starteSDK();
    if (op2) {
      const erg2 = await warte(op2);
      if (erg2?.uri) await lade(erg2.uri, FRAMES ? `veo-fast-${SEKUNDEN}s-frames-durchleitung` : `veo-lite-${SEKUNDEN}s-durchleitung-sdk`);
      const nach2 = await spend();
      log(`Spend nach dem zweiten Video: ${nach2.spend ?? '–'} $ (Differenz zum Stand davor ${diff(nach.spend, nach2.spend)})`);
    }
  }
  fertig();
})().catch((e) => { console.error('Abbruch:', e); fertig(); process.exit(1); });

function diff(a, b) { return a == null || b == null ? '–' : `${(b - a).toFixed(4)} $`; }
function fertig() {
  const p = path.join(OUT, 'bericht-veo-durchleitung.md');
  fs.writeFileSync(p, bericht.join('\n') + '\n');
  console.log(`\nBericht: ${path.relative(ROOT, p)}`);
}
