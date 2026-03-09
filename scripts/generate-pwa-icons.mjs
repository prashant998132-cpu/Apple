// scripts/generate-pwa-icons.mjs
// Run: node scripts/generate-pwa-icons.mjs
// Output: public/icons/icon-192.png + public/icons/icon-512.png
// Requires: npm install --save-dev canvas

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = size / 2;
  const pad    = size * 0.04;

  // Background gradient
  const bg = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, r);
  bg.addColorStop(0,   '#1e1b4b');
  bg.addColorStop(0.6, '#0f0c29');
  bg.addColorStop(1,   '#0a0814');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // Outer glow ring
  const ringR = size * 0.38;
  ctx.strokeStyle = 'rgba(96,165,250,0.3)';
  ctx.lineWidth   = size * 0.025;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner arc (helmet-like)
  const arcR = size * 0.28;
  const grad = ctx.createLinearGradient(cx - arcR, cy - arcR, cx + arcR, cy + arcR);
  grad.addColorStop(0, '#60a5fa');
  grad.addColorStop(1, '#3b82f6');
  ctx.strokeStyle = grad;
  ctx.lineWidth   = size * 0.048;
  ctx.beginPath();
  ctx.arc(cx, cy, arcR, -Math.PI * 0.75, Math.PI * 0.75);
  ctx.stroke();

  // Eye slits (two horizontal glowing lines)
  const eyeY    = cy - size * 0.05;
  const eyeW    = size * 0.22;
  const eyeH    = size * 0.028;
  const eyeGap  = size * 0.08;

  [-1, 1].forEach((side) => {
    const ex = cx + side * (eyeGap / 2 + eyeW / 2);
    const eyeGrad = ctx.createLinearGradient(ex - eyeW / 2, eyeY, ex + eyeW / 2, eyeY);
    eyeGrad.addColorStop(0,   'rgba(147,197,253,0)');
    eyeGrad.addColorStop(0.5, '#bfdbfe');
    eyeGrad.addColorStop(1,   'rgba(147,197,253,0)');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.roundRect(ex - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, eyeH / 2);
    ctx.fill();
  });

  // "J" letter
  const fSize = size * 0.22;
  ctx.font      = `900 ${fSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textGrad = ctx.createLinearGradient(cx, cy + size * 0.06, cx, cy + size * 0.28);
  textGrad.addColorStop(0, '#93c5fd');
  textGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = textGrad;
  ctx.fillText('J', cx, cy + size * 0.17);

  // Bottom scan line accent
  ctx.strokeStyle = 'rgba(96,165,250,0.15)';
  ctx.lineWidth   = size * 0.008;
  for (let y = size * 0.55; y < size * 0.9; y += size * 0.035) {
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(size - pad, y);
    ctx.stroke();
  }

  return canvas;
}

const outDir = join(process.cwd(), 'public', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const canvas = drawIcon(size);
  const buf    = canvas.toBuffer('image/png');
  const out    = join(outDir, `icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
}

console.log('\n🎉 PWA icons generated! Add to manifest.json:\n');
console.log(JSON.stringify({
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ]
}, null, 2));
