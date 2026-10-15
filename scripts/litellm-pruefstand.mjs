#!/usr/bin/env node
// Prüfstand: lernen-media-studio gegen LiteLLM (ADR 0001).
// Liest MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY aus .env.local (oder der Umgebung),
// druckt den Schlüssel nie, legt Bilder und bericht.md unter docs/pruefstand/litellm/ ab.
//
// Aufruf:  node scripts/litellm-pruefstand.mjs [--nur models|chat|bild|edit|fehler] [--teuer]
// --teuer schaltet die großen Stufen (xhigh, max) dazu, sonst nur low/medium/high.

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
  console.error('MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY fehlen (.env.local). Schlüssel in der LiteLLM-Oberfläche anlegen: Virtual Keys, Create Key, Alias lernen-media-studio.');
  process.exit(2);
}
const args = process.argv.slice(2);
const nur = args.includes('--nur') ? args[args.indexOf('--nur') + 1] : null;
const teuer = args.includes('--teuer');

// Dieselben Namen wie später im Studio (ADR 0001): MODELL_CHAT, MODELL_BILD_SCHNELL, MODELL_BILD_PREMIUM.
const CHAT_MODELLE = (process.env.MODELL_CHAT ? [process.env.MODELL_CHAT] : ['claude-haiku-5-5', 'claude-haiku-5.5', 'claude-haiku-4-5']);
const BILD_FLARE = process.env.MODELL_BILD_SCHNELL || 'gpt-image-2.5-flare';
const BILD_SUNBURST = process.env.MODELL_BILD_PREMIUM || 'gpt-image-2.5-sunburst';
const PROMPT = 'editorial illustration of a lighthouse keeper reading a letter, golden hour, low angle shot, risograph print texture';

const bericht = [];
const log = (s = '') => { console.log(s); bericht.push(s); };
const h = { Authorization: `Bearer ${KEY}` };

function kostenKopf(res) {
  return {
    cost: res.headers.get('x-litellm-response-cost'),
    spend: res.headers.get('x-litellm-key-spend'),
  };
}
async function zeit(fn) {
  const t = Date.now();
  const r = await fn();
  return { ...r, ms: Date.now() - t };
}
function pngPlatzhalter() {
  // 1x1 PNG, nur um das Edit-Interface zu prüfen, wenn kein Bild vorliegt.
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
}

// ---- 1. Modelle -----------------------------------------------------------
async function pruefeModelle() {
  log('## 1. Welche Modelle kennt der Schlüssel?');
  const r = await fetch(`${URL_}/v1/models`, { headers: h });
  log(`GET /v1/models -> ${r.status}`);
  if (!r.ok) { log(await r.text()); return {}; }
  const d = await r.json();
  const ids = d.data.map((m) => m.id).sort();
  log(ids.map((i) => `- ${i}`).join('\n'));
  const info = await fetch(`${URL_}/model/info`, { headers: h });
  if (info.ok) {
    const j = await info.json();
    log('\nPreise laut Gateway ($ je 1M Token, leer = Gateway rechnet 0):');
    for (const m of j.data || []) {
      const mi = m.model_info || {};
      const inC = mi.input_cost_per_token ? (mi.input_cost_per_token * 1e6).toFixed(2) : '';
      const outC = mi.output_cost_per_token ? (mi.output_cost_per_token * 1e6).toFixed(2) : '';
      log(`- ${m.model_name} -> ${m.litellm_params?.model} | mode ${mi.mode || '?'} | in ${inC || '–'} | out ${outC || '–'}`);
    }
  } else {
    log(`GET /model/info -> ${info.status} (für diesen Schlüssel nicht lesbar)`);
  }
  for (const m of [BILD_FLARE, BILD_SUNBURST, ...CHAT_MODELLE]) {
    log(`${ids.includes(m) ? 'OK  ' : 'FEHLT'} ${m}`);
  }
  return { ids };
}

// ---- 2. Chat über /v1/messages (so postet @ai-sdk/anthropic mit baseURL) ----
async function pruefeChat(ids) {
  log('\n## 2. Chat (Haiku) über /v1/messages');
  const modell = CHAT_MODELLE.find((m) => !ids || ids.includes(m)) || CHAT_MODELLE[0];
  const png = pngPlatzhalter().toString('base64');
  const kopf = { ...h, 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };
  for (const [name, body] of [
    ['Text', { model: modell, max_tokens: 60, system: 'Antworte in einem Satz auf Deutsch.', messages: [{ role: 'user', content: 'Was ist das 4K-Framework? Ein Satz.' }] }],
    ['Text + Bild', { model: modell, max_tokens: 60, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } }, { type: 'text', text: 'Welche Farbe hat das Bild? Ein Wort.' }] }] }],
  ]) {
    const r = await zeit(async () => {
      const res = await fetch(`${URL_}/v1/messages`, { method: 'POST', headers: kopf, body: JSON.stringify(body) });
      const txt = await res.text();
      return { status: res.status, kopf: kostenKopf(res), txt };
    });
    let antwort = r.txt.slice(0, 200);
    try { const j = JSON.parse(r.txt); antwort = j.content?.[0]?.text || j.error?.message || antwort; } catch {}
    log(`${name}: ${modell} -> ${r.status} in ${r.ms} ms | Kosten ${r.kopf.cost ?? '–'} | Spend ${r.kopf.spend ?? '–'}`);
    log(`  Antwort: ${String(antwort).replace(/\s+/g, ' ').slice(0, 160)}`);
  }
  // Streaming, wie streamText es tut
  const r = await zeit(async () => {
    const res = await fetch(`${URL_}/v1/messages`, { method: 'POST', headers: kopf, body: JSON.stringify({ model: modell, max_tokens: 40, stream: true, messages: [{ role: 'user', content: 'Zähle bis fünf.' }] }) });
    const txt = await res.text();
    return { status: res.status, kopf: kostenKopf(res), events: (txt.match(/^event: /gm) || []).length, ctype: res.headers.get('content-type') };
  });
  log(`Stream: ${modell} -> ${r.status} in ${r.ms} ms | ${r.ctype} | ${r.events} Events`);
}

// ---- 3. Bild erzeugen -------------------------------------------------------
async function erzeuge(modell, quality, size, tag) {
  const r = await zeit(async () => {
    const res = await fetch(`${URL_}/v1/images/generations`, { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ model: modell, prompt: PROMPT, quality, size, n: 1, output_format: 'png' }) });
    const txt = await res.text();
    return { status: res.status, kopf: kostenKopf(res), txt };
  });
  let usage = null, datei = null, fehler = null;
  try {
    const j = JSON.parse(r.txt);
    if (j.data?.[0]?.b64_json) {
      datei = path.join(OUT, `${tag}.png`);
      fs.writeFileSync(datei, Buffer.from(j.data[0].b64_json, 'base64'));
    } else if (j.data?.[0]?.url) {
      datei = j.data[0].url;
    }
    usage = j.usage || null;
    fehler = j.error?.message || null;
  } catch { fehler = r.txt.slice(0, 200); }
  log(`${tag}: ${modell} ${quality} ${size} -> ${r.status} in ${(r.ms / 1000).toFixed(1)} s | Kosten ${r.kopf.cost ?? '–'} | Token in/out ${usage?.input_tokens ?? '–'}/${usage?.output_tokens ?? '–'} | ${datei ? path.basename(String(datei)) : 'kein Bild'}${fehler ? ' | ' + fehler : ''}`);
  return { ok: r.status === 200 && !!datei, datei, ms: r.ms, usage, cost: r.kopf.cost };
}
async function pruefeBild() {
  log('\n## 3. Bilder erzeugen (gleicher Prompt, Stufen im Vergleich)');
  const stufen = teuer ? ['low', 'medium', 'high', 'xhigh', 'max'] : ['low', 'medium', 'high'];
  const erg = {};
  for (const q of stufen) erg[`flare-${q}`] = await erzeuge(BILD_FLARE, q, '1024x1024', `flare-${q}-1024`);
  for (const q of stufen) erg[`sunburst-${q}`] = await erzeuge(BILD_SUNBURST, q, '1024x1024', `sunburst-${q}-1024`);
  erg['flare-medium-quer'] = await erzeuge(BILD_FLARE, 'medium', '1536x1024', 'flare-medium-1536x1024');
  erg['flare-medium-16x9'] = await erzeuge(BILD_FLARE, 'medium', '2048x1152', 'flare-medium-2048x1152');
  return erg;
}

// ---- 4. Bild bearbeiten (multipart, mehrere Bilder, JPEG, nicht quadratisch) -
async function bearbeite(modell, bilder, quality, tag, feld = 'image') {
  const fd = new FormData();
  fd.append('model', modell);
  fd.append('prompt', 'Transform into watercolor. Keep composition identical. Apply style only to color and texture.');
  for (const b of bilder) fd.append(feld, new Blob([b.buf], { type: b.type }), b.name);
  if (quality) fd.append('quality', quality);
  const r = await zeit(async () => {
    const res = await fetch(`${URL_}/v1/images/edits`, { method: 'POST', headers: h, body: fd });
    const txt = await res.text();
    return { status: res.status, kopf: kostenKopf(res), txt };
  });
  let datei = null, fehler = null, usage = null;
  try {
    const j = JSON.parse(r.txt);
    if (j.data?.[0]?.b64_json) { datei = path.join(OUT, `${tag}.png`); fs.writeFileSync(datei, Buffer.from(j.data[0].b64_json, 'base64')); }
    usage = j.usage || null; fehler = j.error?.message || null;
  } catch { fehler = r.txt.slice(0, 200); }
  log(`${tag}: ${modell} ${quality || 'auto'} ${bilder.length} Bild(er) als '${feld}' [${bilder.map((b) => b.type.split('/')[1]).join(',')}] -> ${r.status} in ${(r.ms / 1000).toFixed(1)} s | Kosten ${r.kopf.cost ?? '–'} | Token in/out ${usage?.input_tokens ?? '–'}/${usage?.output_tokens ?? '–'}${datei ? '' : ' | kein Bild'}${fehler ? ' | ' + fehler : ''}`);
  return { ok: r.status === 200 && !!datei, ms: r.ms };
}
async function pruefeEdit(bildErg) {
  log('\n## 4. Bilder bearbeiten über /v1/images/edits');
  const vorhanden = (p) => p && !String(p).startsWith('http') && fs.existsSync(p);
  const quelle = (bildErg && Object.values(bildErg).find((e) => e.ok && vorhanden(e.datei))?.datei) || null;
  const quer = bildErg?.['flare-medium-quer']?.datei;
  const png = quelle ? fs.readFileSync(quelle) : pngPlatzhalter();
  if (!quelle) log('(kein erzeugtes Bild vorhanden, Platzhalter 1x1 PNG, nur Interface-Prüfung)');
  await bearbeite(BILD_FLARE, [{ buf: png, type: 'image/png', name: 'a.png' }], 'medium', 'edit-flare-1png');
  await bearbeite(BILD_SUNBURST, [{ buf: png, type: 'image/png', name: 'a.png' }], 'high', 'edit-sunburst-1png');
  const jpgPfad = path.join(OUT, 'quelle.jpg');
  if (fs.existsSync(jpgPfad)) await bearbeite(BILD_FLARE, [{ buf: fs.readFileSync(jpgPfad), type: 'image/jpeg', name: 'q.jpg' }], 'medium', 'edit-flare-jpeg');
  else log('(quelle.jpg fehlt: JPEG-Eingabe nicht geprüft. Beliebiges Foto unter docs/pruefstand/litellm/quelle.jpg ablegen und erneut laufen lassen.)');
  if (vorhanden(quer)) await bearbeite(BILD_FLARE, [{ buf: fs.readFileSync(quer), type: 'image/png', name: 'q.png' }], 'medium', 'edit-flare-nichtquadratisch');
  const zwei = [{ buf: png, type: 'image/png', name: 'a.png' }, { buf: vorhanden(quer) ? fs.readFileSync(quer) : png, type: 'image/png', name: 'b.png' }];
  // Zwei Schreibweisen für mehrere Bilder: Feld 'image' wiederholt (LiteLLM-Doku) und 'image[]' (OpenAI-SDK). Welche der Gateway annimmt, entscheidet den Bau.
  await bearbeite(BILD_FLARE, zwei, 'medium', 'edit-flare-2bilder-image', 'image');
  await bearbeite(BILD_FLARE, zwei, 'medium', 'edit-flare-2bilder-imagearray', 'image[]');
}

// ---- 5. Fehlerbilder ---------------------------------------------------------
async function pruefeFehler() {
  log('\n## 5. Fehlerbilder (was das Studio abfangen muss)');
  const faelle = [
    ['Unbekanntes Modell', { model: 'gpt-image-gibt-es-nicht', prompt: 'x' }],
    ['Ungültige Qualität', { model: BILD_FLARE, prompt: 'x', quality: 'hd', size: '1024x1024' }],
    ['Ungültige Größe', { model: BILD_FLARE, prompt: 'x', quality: 'low', size: '100x100' }],
  ];
  for (const [name, body] of faelle) {
    const res = await fetch(`${URL_}/v1/images/generations`, { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const txt = await res.text();
    let msg = txt.slice(0, 200); try { msg = JSON.parse(txt).error?.message || msg; } catch {}
    log(`${name}: ${res.status} | ${String(msg).replace(/\s+/g, ' ').slice(0, 180)}`);
  }
  const bad = await fetch(`${URL_}/v1/models`, { headers: { Authorization: 'Bearer sk-falsch' } });
  log(`Falscher Schlüssel: ${bad.status}`);
}

(async () => {
  log(`# Prüfstand LiteLLM, ${new Date().toISOString().slice(0, 16)} gegen ${URL_}`);
  let m = {};
  if (!nur || nur === 'models') m = await pruefeModelle();
  if (!nur || nur === 'chat') await pruefeChat(m.ids);
  let b = null;
  if (!nur || nur === 'bild') b = await pruefeBild();
  if (!nur || nur === 'edit') await pruefeEdit(b);
  if (!nur || nur === 'fehler') await pruefeFehler();
  fs.writeFileSync(path.join(OUT, 'bericht.md'), bericht.join('\n') + '\n');
  console.log(`\nBericht: ${path.relative(ROOT, path.join(OUT, 'bericht.md'))}`);
})().catch((e) => { console.error('Abbruch:', e.message); process.exit(1); });
