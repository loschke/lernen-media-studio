#!/usr/bin/env node
// Prüfstand Video fortsetzen: Gemini Omni Flash über die Gemini-Durchleitung des Gateways (ADR 0003).
// Fragen: Setzt Omni ein eigenes Video über `previous_interaction_id` fort? Kommt das ganze Video
// zurück oder nur das neue Stück? Geht eine Kette? Geht dasselbe mit einem Video als Eingabe
// (Galerie-Video ohne Vorgangskennung)? Laut Googles Doku ist die Fortsetzung hochgeladener Videos
// im EWR gesperrt, die Fortsetzung eigener Vorgänge nicht.
// Bericht: docs/pruefstand/litellm/bericht-omni-durchleitung.md (wird angehängt), Videos daneben.
//
// Aufruf: node scripts/omni-fortsetzen-pruefstand.mjs [--nur kette|eingabe] [--modell gemini-omni-1.2-flash] [--aufloesung 360p] [--format 16:9]
// Kosten eines vollen Laufs in 360p: unter 0,50 $.

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
const AUFL = arg('--aufloesung', '360p');
const FORMAT = arg('--format', '16:9');
const BASIS = `${URL_}/gemini/v1beta/interactions`;
const h = { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' };
const bericht = [];
const log = (s = '') => { console.log(s); bericht.push(s); };
const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));
const kurz = (s) => String(s).replace(/\s+/g, ' ').slice(0, 400);

function probe(datei) {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', datei]).toString());
    const v = j.streams.find((s) => s.codec_type === 'video'); const a = j.streams.find((s) => s.codec_type === 'audio');
    return `${v?.width}×${v?.height}, ${Number(j.format.duration).toFixed(1)} s${a ? ', mit Ton' : ', ohne Ton'}`;
  } catch { return 'ffprobe nicht verfügbar'; }
}

/** Startet im Hintergrund, fragt ab, legt das Video ab. Gibt Kennung und Datei zurück. */
async function lauf(name, body, tag) {
  log(`\n## ${name}`);
  log(`POST /gemini/v1beta/interactions ${JSON.stringify(body, (k, v) => (k === 'data' && typeof v === 'string' ? `<${v.length} Zeichen Base64>` : v))}`);
  const t0 = Date.now();
  const res = await fetch(BASIS, { method: 'POST', headers: h, body: JSON.stringify({ ...body, background: true, store: true }) });
  const txt = await res.text(); let j = null; try { j = JSON.parse(txt); } catch {}
  log(`-> Start ${res.status} in ${((Date.now() - t0) / 1000).toFixed(1)} s${j ? `, status ${j.status}` : ''}`);
  if (!res.ok || !j?.id) { log(`  ${kurz(txt)}`); return null; }
  let job = j;
  for (let n = 1; job.status === 'in_progress' && Date.now() - t0 < 300_000; n++) {
    await schlafe(4000);
    const g = await fetch(`${BASIS}/${j.id}`, { headers: h });
    const gt = await g.text();
    if (!g.ok) { log(`  Abruf ${n}: ${g.status} ${kurz(gt)}`); if (g.status === 403 || g.status === 429 || g.status >= 500) continue; return null; }
    job = JSON.parse(gt);
  }
  const s = Math.round((Date.now() - t0) / 1000);
  log(`  ${job.status} nach ${s} s, Schritte: ${(job.steps || []).map((x) => `${x.type}[${(x.content || []).map((c) => c.type).join(',')}]`).join(' ')}`);
  log(`  Verbrauch: Eingabe ${JSON.stringify(job.usage?.input_tokens_by_modality ?? [])}, Ausgabe ${JSON.stringify(job.usage?.output_tokens_by_modality ?? [])}`);
  if (job.status !== 'completed') { log(`  ${kurz(JSON.stringify(job.error || job))}`); return { id: j.id, datei: null }; }
  const ausgabe = (job.steps ?? []).filter((x) => x.type !== 'user_input').flatMap((x) => x.content ?? []);
  for (const c of ausgabe) if (c.type === 'text' && c.text) log(`  Text des Modells: ${kurz(c.text)}`);
  const v = ausgabe.find((c) => c.type === 'video' && c.data);
  if (!v) { log('  kein Video in der Antwort'); return { id: j.id, datei: null }; }
  const datei = path.join(OUT, `${tag}.mp4`);
  fs.writeFileSync(datei, Buffer.from(v.data, 'base64'));
  log(`  Datei ${path.basename(datei)}: ${(fs.statSync(datei).size / 1e6).toFixed(2)} MB, ${probe(datei)}`);
  return { id: j.id, datei };
}

const format = (duration) => ({ type: 'video', aspect_ratio: FORMAT, resolution: AUFL, duration });
const P1 = 'A red vintage tram drives slowly through a rainy old town street at dusk, wet cobblestones reflect the lights. Tracking shot from the sidewalk. Rain ambience, soft squeal of the tram.';
const P2 = 'Extend this video: the tram stops at a small station, the doors open and a woman with a yellow umbrella steps out.';
const P3 = 'Extend this video: the woman walks towards the camera and smiles, the tram drives away behind her.';

log(`# Prüfstand Video fortsetzen, ${new Date().toISOString()}, Modell ${MODELL}, ${AUFL}, ${FORMAT}`);

const basis = await lauf('Basis: Text → Video, 4 s', { model: MODELL, input: P1, response_format: format('4s') }, `${MODELL}-fortsetzen-1-basis`);

if (basis?.id && (!nur || nur === 'kette')) {
  const zwei = await lauf('Fortsetzen über previous_interaction_id, +4 s', {
    model: MODELL, previous_interaction_id: basis.id, input: P2, response_format: format('4s'),
  }, `${MODELL}-fortsetzen-2`);
  if (zwei?.id && zwei.datei) {
    await lauf('Kette: die Fortsetzung noch einmal fortsetzen, +4 s', {
      model: MODELL, previous_interaction_id: zwei.id, input: P3, response_format: format('4s'),
    }, `${MODELL}-fortsetzen-3`);
  } else if (zwei?.id) {
    await lauf('Zweiter Versuch mit task=extend', {
      model: MODELL, previous_interaction_id: basis.id, input: P2, response_format: format('4s'),
      generation_config: { video_config: { task: 'extend' } },
    }, `${MODELL}-fortsetzen-2-task`);
  }
}

if (basis?.datei && (!nur || nur === 'eingabe')) {
  // Der Fall „Video aus der Galerie ohne Vorgangskennung“: das Video selbst als Eingabe.
  await lauf('Fortsetzen mit dem Video als Eingabe (Base64), +4 s', {
    model: MODELL,
    input: [
      { type: 'video', mime_type: 'video/mp4', data: fs.readFileSync(basis.datei).toString('base64') },
      { type: 'text', text: P2 },
    ],
    response_format: format('4s'),
  }, `${MODELL}-fortsetzen-eingabe`);
}

fs.appendFileSync(path.join(OUT, 'bericht-omni-durchleitung.md'), bericht.join('\n') + '\n\n');
console.log('\nBericht angehängt: docs/pruefstand/litellm/bericht-omni-durchleitung.md');
