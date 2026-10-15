#!/usr/bin/env node
// Probelauf durch denselben SDK-Pfad wie die Routen (ADR 0001):
// generateImage über @ai-sdk/openai (erzeugen und bearbeiten) und streamText
// über @ai-sdk/anthropic, beide mit Gateway-Adresse. Liest .env.local, druckt
// den Schlüssel nie. Kostet etwa 3 Cent.
//
// Aufruf: node scripts/litellm-sdk-probe.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'pruefstand', 'litellm');
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const url = (process.env.MODELL_GATEWAY_URL || '').replace(/\/+$/, '');
const key = process.env.MODELL_GATEWAY_KEY || '';
if (!url || !key) { console.error('MODELL_GATEWAY_URL / MODELL_GATEWAY_KEY fehlen'); process.exit(2); }

const openai = createOpenAI({ baseURL: `${url}/v1`, apiKey: key });
const anthropic = createAnthropic({ baseURL: `${url}/v1`, apiKey: key });
const t = () => Date.now();

// 1. Erzeugen: Schnell = Flare medium, 3:2
let s = t();
const gen = await generateImage({
  model: openai.image(process.env.MODELL_BILD_SCHNELL || 'gpt-image-2.5-flare'),
  prompt: 'risograph print of a paper boat on a puddle, overcast light, top-down view',
  size: '1536x1024',
  maxRetries: 0,
  providerOptions: { openai: { quality: 'medium', outputFormat: 'png' } },
  abortSignal: AbortSignal.timeout(110_000),
});
const img = gen.images[0];
fs.writeFileSync(path.join(OUT, 'sdk-erzeugt.png'), Buffer.from(img.uint8Array));
console.log(`erzeugen: ${((t() - s) / 1000).toFixed(1)} s | ${img.mediaType} | ${img.uint8Array.length} Bytes | usage`, gen.providerMetadata?.openai?.images?.[0]?.size, gen.warnings?.length ? gen.warnings : '');

// 2. Bearbeiten: Premium = Sunburst high wäre 55 s, hier Flare low mit JPEG-Eingabe
s = t();
const jpg = fs.readFileSync(path.join(OUT, 'quelle.jpg'));
const edit = await generateImage({
  model: openai.image(process.env.MODELL_BILD_SCHNELL || 'gpt-image-2.5-flare'),
  prompt: { images: [jpg], text: 'Transform into a pencil sketch. Keep composition identical.' },
  maxRetries: 0,
  providerOptions: { openai: { quality: 'low', outputFormat: 'png' } },
  abortSignal: AbortSignal.timeout(110_000),
});
const e = edit.images[0];
fs.writeFileSync(path.join(OUT, 'sdk-bearbeitet.png'), Buffer.from(e.uint8Array));
console.log(`bearbeiten (JPEG rein): ${((t() - s) / 1000).toFixed(1)} s | ${e.mediaType} | ${e.uint8Array.length} Bytes | size`, edit.providerMetadata?.openai?.images?.[0]?.size, edit.warnings?.length ? edit.warnings : '');

// 3. Chat gestreamt, mit Bild
s = t();
const result = streamText({
  model: anthropic(process.env.MODELL_CHAT || 'claude-haiku-5-5'),
  system: 'Antworte auf Deutsch in einem Satz.',
  messages: [{ role: 'user', content: [{ type: 'image', image: jpg }, { type: 'text', text: 'Was ist auf dem Bild? Ein Satz.' }] }],
});
let text = '';
for await (const chunk of result.textStream) text += chunk;
const usage = await result.usage;
console.log(`chat (Stream, Bild): ${((t() - s) / 1000).toFixed(1)} s | Token in/out ${usage?.inputTokens}/${usage?.outputTokens} | ${text.replace(/\s+/g, ' ').slice(0, 140)}`);
