#!/usr/bin/env node
// Prüfstand Etappe 2, Weg b: Veo über die Videoschnittstelle des Gateways (/v1/videos, ADR 0002).
// Misst genau die Felder, die die Studio-Routen schicken: Modell, Dauer (seconds), Größe (size) und
// Startbild als Multipart input_reference. Liest MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY aus .env.local.
// Bericht: docs/pruefstand/litellm/bericht-veo-videos.md (wird angehängt), Videos daneben.
//
// Aufruf: node scripts/veo-videos-pruefstand.mjs [--nur text|bild|fehler] [--modell veo-3.1-lite-generate-preview]

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
const MODELL = arg('--modell', 'veo-3.1-lite-generate-preview');
const h = { Authorization: `Bearer ${KEY}` };
const bericht = [];
const log = (s = '') => { console.log(s); bericht.push(s); };
const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));
const koepfe = (res) => ({ cost: res.headers.get('x-litellm-response-cost'), spend: res.headers.get('x-litellm-key-spend') });

function probe(datei) {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', datei]).toString());
    const v = j.streams.find((s) => s.codec_type === 'video'); const a = j.streams.find((s) => s.codec_type === 'audio');
    return `${v?.width}×${v?.height}, ${Number(j.format.duration).toFixed(1)} s${a ? ', mit Ton' : ', ohne Ton'}`;
  } catch { return 'ffprobe nicht verfügbar'; }
}

async function warteUndLade(id, tag) {
  const t0 = Date.now(); let n = 0, erster403 = null, status = null;
  while (Date.now() - t0 < 300_000) {
    await schlafe(n === 0 ? 8000 : 5000); n++;
    const res = await fetch(`${URL_}/v1/videos/${id}`, { headers: h });
    const txt = await res.text(); const s = Math.round((Date.now() - t0) / 1000);
    if (!res.ok) {
      log(`  Abruf ${n} nach ${s} s: ${res.status} ${txt.replace(/\s+/g, ' ').slice(0, 140)}`);
      if (res.status === 403 && erster403 === null) erster403 = n;
      if (res.status === 403 || res.status >= 500 || res.status === 429) continue;
      return null;
    }
    const j = JSON.parse(txt); status = j.status;
    log(`  Abruf ${n} nach ${s} s: 200, status=${status}${j.progress != null ? ', progress ' + j.progress : ''}${j.error ? ', error ' + JSON.stringify(j.error).slice(0, 120) : ''}`);
    if (status === 'completed' || status === 'failed') break;
  }
  if (erster403 !== null) log(`  Hinweis: 403 beim Abruf ${erster403}, danach normal.`);
  if (status !== 'completed') { log('  nicht fertig'); return null; }
  const t = Date.now();
  const res = await fetch(`${URL_}/v1/videos/${id}/content`, { headers: h });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.startsWith('video/')) { log(`  Download: ${res.status} ${ct} ${(await res.text()).slice(0, 140)}`); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  const datei = path.join(OUT, `${tag}.mp4`); fs.writeFileSync(datei, buf);
  log(`  Download: 200 ${ct}, ${(buf.length / 1e6).toFixed(1)} MB in ${Date.now() - t} ms, Datei ${path.basename(datei)}: ${probe(datei)}`);
  return datei;
}

async function startJson(body, name) {
  log(`\n## ${name}`);
  log(`POST /v1/videos ${JSON.stringify(body)}`);
  const t = Date.now();
  const res = await fetch(`${URL_}/v1/videos`, { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const txt = await res.text(); const k = koepfe(res);
  let j = null; try { j = JSON.parse(txt); } catch {}
  log(`-> ${res.status} in ${Date.now() - t} ms | Kosten ${k.cost ?? '–'} | Spend ${k.spend ?? '–'} | ${j ? JSON.stringify(j).slice(0, 220) : txt.slice(0, 220)}`);
  return res.ok ? j : null;
}

async function startMultipart(felder, bild, name) {
  log(`\n## ${name}`);
  const fd = new FormData();
  for (const [k, v] of Object.entries(felder)) fd.append(k, v);
  fd.append('input_reference', new Blob([fs.readFileSync(bild.pfad)], { type: bild.type }), bild.name);
  log(`POST /v1/videos multipart ${JSON.stringify(felder)} + input_reference ${bild.name} (${(fs.statSync(bild.pfad).size / 1e6).toFixed(1)} MB, ${bild.type})`);
  const t = Date.now();
  const res = await fetch(`${URL_}/v1/videos`, { method: 'POST', headers: h, body: fd });
  const txt = await res.text(); const k = koepfe(res);
  let j = null; try { j = JSON.parse(txt); } catch {}
  log(`-> ${res.status} in ${Date.now() - t} ms | Kosten ${k.cost ?? '–'} | Spend ${k.spend ?? '–'} | ${j ? JSON.stringify(j).slice(0, 220) : txt.slice(0, 220)}`);
  return res.ok ? j : null;
}

(async () => {
  log(`# Prüfstand /v1/videos, ${new Date().toISOString().slice(0, 16)} gegen ${URL_}, Modell ${MODELL}`);
  if (!nur || nur === 'text') {
    const j = await startJson({ model: MODELL, prompt: 'A paper boat drifting on a calm pond at golden hour, soft ripples, cinematic', seconds: '6', size: '720x1280' }, '1. Text, 6 s, Hochformat 720x1280');
    if (j?.id) await warteUndLade(j.id, 'veo-videos-lite-6s-hochformat');
  }
  if (!nur || nur === 'bild') {
    const bild = { pfad: path.join(OUT, 'quelle.jpg'), type: 'image/jpeg', name: 'start.jpg' };
    if (fs.existsSync(bild.pfad)) {
      const j = await startMultipart({ model: MODELL, prompt: 'Slow push-in, warm light, gentle camera move', seconds: '4', size: '1280x720' }, bild, '2. Startbild als JPEG (Multipart), 4 s, 1280x720');
      if (j?.id) await warteUndLade(j.id, 'veo-videos-lite-4s-startbild-jpeg');
    } else log('\n## 2. Startbild: quelle.jpg fehlt, übersprungen');
  }
  if (!nur || nur === 'fehler') {
    log('\n## 3. Fehlerbilder (kosten nichts, wenn der Gateway ablehnt)');
    await startJson({ model: MODELL, prompt: 'x', seconds: '5', size: '1280x720' }, '3a. Ungültige Dauer 5 s');
    await startJson({ model: MODELL, prompt: 'x', seconds: '4', size: '1000x1000' }, '3b. Ungültige Größe');
    await startJson({ model: 'veo-gibt-es-nicht', prompt: 'x', seconds: '4' }, '3c. Unbekanntes Modell');
    for (const id of ['video_gibt_es_nicht', 'video_abc-123']) {
      const r = await fetch(`${URL_}/v1/videos/${id}`, { headers: h });
      log(`GET /v1/videos/${id} -> ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 140)}`);
    }
  }
  fs.appendFileSync(path.join(OUT, 'bericht-veo-videos.md'), '\n---\n\n' + bericht.join('\n') + '\n');
  console.log('\nBericht: docs/pruefstand/litellm/bericht-veo-videos.md');
})().catch((e) => { console.error('Abbruch:', e); process.exit(1); });
