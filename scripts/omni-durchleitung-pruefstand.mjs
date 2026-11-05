#!/usr/bin/env node
// Prüfstand Veo-Nachfolge: Gemini Omni Flash über die Gemini-Durchleitung des Gateways
// (POST {MODELL_GATEWAY_URL}/gemini/v1beta/interactions, Kopf x-goog-api-key = virtueller Schlüssel).
// Anlass: Google hat die Veo-3.1-Previews am 22.10.2026 abgeschaltet, /v1/videos des Gateways ruft
// weiter predictLongRunning auf und antwortet für Omni mit 404 (gemessen 05.11.2026).
// Voraussetzung: Im LiteLLM gibt es einen Eintrag mit dem öffentlichen Namen OHNE Präfix
// (z. B. gemini-omni-1.2-flash) und er steht in der Modellliste des Studio-Schlüssels.
// Bericht: docs/pruefstand/litellm/bericht-omni-durchleitung.md (wird angehängt), Videos daneben.
//
// Aufruf: node scripts/omni-durchleitung-pruefstand.mjs [--nur text|bild|hintergrund|fehler] [--modell gemini-omni-1.2-flash]
// Kosten eines vollen Laufs mit Omni 1.2: rund 0,45 $ (4 s 720p, zweimal 3 s 360p).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'pruefstand', 'litellm');
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const URL_ = (process.env.MODELL_GATEWAY_URL || '').replace(/\/+$/, '');
const KEY = process.env.MODELL_GATEWAY_KEY || '';
if (!URL_ || !KEY) { console.error('MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY fehlen (.env.local).'); process.exit(2); }
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const nur = arg('--nur', null);
const MODELL = arg('--modell', 'gemini-omni-1.2-flash');
const BASIS = `${URL_}/gemini/v1beta/interactions`;
const h = { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' };
const bericht = [];
const log = (s = '') => { console.log(s); bericht.push(s); };
const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));
const koepfe = (res) => `Kosten ${res.headers.get('x-litellm-response-cost') ?? '–'} | Spend ${res.headers.get('x-litellm-key-spend') ?? '–'}`;
const kurz = (s) => s.replace(/\s+/g, ' ').slice(0, 300);

function probe(datei) {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', datei]).toString());
    const v = j.streams.find((s) => s.codec_type === 'video'); const a = j.streams.find((s) => s.codec_type === 'audio');
    return `${v?.width}×${v?.height}, ${Number(j.format.duration).toFixed(1)} s${a ? ', mit Ton' : ', ohne Ton'}`;
  } catch { return 'ffprobe nicht verfügbar'; }
}

/** Video aus der Antwort ziehen (inline Base64) und ablegen. */
function sichere(j, tag) {
  const teile = (j.steps || []).flatMap((s) => (s.content || []).map((c) => ({ schritt: s.type, ...c })));
  for (const c of teile) if (c.type !== 'video') log(`  Teil ${c.schritt}/${c.type}: ${kurz(c.text || c.uri || '')}`);
  const v = teile.find((c) => c.type === 'video');
  if (!v) { log('  kein Video in der Antwort'); return null; }
  if (!v.data) { log(`  Video nur als Adresse: ${v.uri}`); return null; }
  const datei = path.join(OUT, `${tag}.mp4`);
  fs.writeFileSync(datei, Buffer.from(v.data, 'base64'));
  log(`  Datei ${path.basename(datei)}: ${(fs.statSync(datei).size / 1e6).toFixed(2)} MB, ${probe(datei)}`);
  return datei;
}

async function erzeuge(name, body, tag) {
  log(`\n## ${name}`);
  const zeig = JSON.stringify(body, (k, v) => (k === 'data' && typeof v === 'string' ? `<${v.length} Zeichen Base64>` : v));
  log(`POST /gemini/v1beta/interactions ${zeig}`);
  const t = Date.now();
  let res;
  try {
    res = await fetch(BASIS, { method: 'POST', headers: h, body: JSON.stringify(body), signal: AbortSignal.timeout(420_000) });
  } catch (e) { log(`-> Abbruch nach ${Date.now() - t} ms: ${e.message}`); return null; }
  const txt = await res.text(); const ms = Date.now() - t;
  let j = null; try { j = JSON.parse(txt); } catch {}
  log(`-> ${res.status} in ${(ms / 1000).toFixed(1)} s | ${koepfe(res)} | Antwort ${(txt.length / 1e6).toFixed(2)} MB`);
  if (!res.ok || !j) { log(`  ${kurz(txt)}`); return null; }
  log(`  id ${j.id ?? '–'}, status ${j.status ?? '–'}, usage ${kurz(JSON.stringify(j.usage || {}))}`);
  if (tag) sichere(j, tag);
  return j;
}

const format = (duration, resolution) => ({ type: 'video', aspect_ratio: '16:9', resolution, duration });
const PROMPT = 'Ein Papierflieger gleitet durch eine Bibliothek, eine durchgehende Einstellung, warmes Licht.';

log(`# Prüfstand Omni über die Durchleitung, ${new Date().toISOString()}, Modell ${MODELL}`);

if (!nur || nur === 'text') {
  await erzeuge('Text → Video, 4 s, 720p, synchron', {
    model: MODELL, input: PROMPT, response_format: format('4s', '720p'), store: false,
  }, `${MODELL}-4s-720p`);
}

if (!nur || nur === 'bild') {
  const quelle = path.join(OUT, 'quelle.jpg');
  if (!fs.existsSync(quelle)) log('\n## Startbild: quelle.jpg fehlt, übersprungen');
  else {
    await erzeuge('Startbild → Video, 3 s, 360p, synchron', {
      model: MODELL,
      input: [
        { type: 'image', data: fs.readFileSync(quelle).toString('base64'), mime_type: 'image/jpeg' },
        { type: 'text', text: 'Die Kamera fährt langsam auf das Motiv zu, leichte Bewegung im Bild.' },
      ],
      response_format: format('3s', '360p'),
      store: false,
    }, `${MODELL}-3s-360p-startbild`);
  }
}

if (!nur || nur === 'hintergrund') {
  // Frage: Trägt background=true? Dann bliebe im Studio der Ablauf Start + Statusabfrage.
  const j = await erzeuge('Text → Video, 3 s, 360p, background=true', {
    model: MODELL, input: PROMPT, response_format: format('3s', '360p'), background: true, store: true,
  }, null);
  if (j?.id) {
    const t0 = Date.now(); let fertig = null;
    for (let n = 1; Date.now() - t0 < 300_000; n++) {
      if (j.status === 'completed' && n === 1) { fertig = j; log('  schon in der Startantwort fertig (kein Hintergrundlauf)'); break; }
      await schlafe(n === 1 ? 8000 : 5000);
      const res = await fetch(`${BASIS}/${j.id}`, { headers: h });
      const txt = await res.text(); const s = Math.round((Date.now() - t0) / 1000);
      let k = null; try { k = JSON.parse(txt); } catch {}
      log(`  Abruf ${n} nach ${s} s: ${res.status}${k ? ', status=' + k.status : ' ' + kurz(txt)}`);
      if (!res.ok) { if (res.status === 403 || res.status === 429 || res.status >= 500) continue; break; }
      if (k.status === 'completed') { fertig = k; break; }
      if (k.status === 'failed' || k.status === 'cancelled') { log(`  ${kurz(JSON.stringify(k.error || k))}`); break; }
    }
    if (fertig) sichere(fertig, `${MODELL}-3s-360p-hintergrund`);
    else log('  nicht fertig geworden');
  }
}

if (!nur || nur === 'fehler') {
  await erzeuge('Fehlerfall: Dauer 20 s (über der Grenze)', {
    model: MODELL, input: PROMPT, response_format: format('20s', '360p'), store: false,
  }, null);
  await erzeuge('Fehlerfall: unbekanntes Modell', {
    model: 'gemini-omni-gibt-es-nicht', input: PROMPT, response_format: format('3s', '360p'), store: false,
  }, null);
}

fs.appendFileSync(path.join(OUT, 'bericht-omni-durchleitung.md'), bericht.join('\n') + '\n\n');
console.log('\nBericht angehängt: docs/pruefstand/litellm/bericht-omni-durchleitung.md');
