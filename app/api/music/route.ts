// app/api/music/route.ts — v2 BANDWIDTH-OPTIMIZED
// Strategy: Return external links (Suno/Udio) + HuggingFace URL directly
// Never proxy audio binary through Vercel

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLES: Record<string, string> = {
  bollywood_sad:   'bollywood sad romantic hindi song, piano, strings, slow, emotional',
  bollywood_happy: 'bollywood upbeat dance music, dhol, tabla, celebration',
  devotional:      'indian devotional bhajan, harmonium, flute, peaceful',
  lofi_study:      'lofi hip hop study beats, calm piano, concentration',
  classical:       'hindustani classical raga, sitar, tabla, meditative',
  folk_mp:         'madhya pradesh folk music, tribal instruments, vibrant',
  neet_focus:      'focus instrumental, binaural beats, alpha waves, study',
  party:           'bollywood party remix, electronic bass, EDM energy',
  chill:           'chill ambient, soft piano, nature sounds, relaxing',
  motivational:    'epic orchestral, rising crescendo, inspiring, powerful',
};

export async function POST(req: NextRequest) {
  const { prompt, style } = await req.json();
  const stylePrompt = style ? (STYLES[style] || style) : '';
  const finalPrompt = [stylePrompt, prompt].filter(Boolean).join(', ');

  // Direct links to music generators (browser opens them, zero Vercel bandwidth)
  const links = [
    { name: '🎵 Suno AI', url: `https://suno.com/create?prompt=${encodeURIComponent(finalPrompt)}`, quality: 5, free: '50/day' },
    { name: '🎵 Udio', url: `https://www.udio.com/create?prompt=${encodeURIComponent(finalPrompt)}`, quality: 5, free: 'Free tier' },
    { name: '🎵 Soundverse', url: `https://soundverse.ai/create`, quality: 4, free: 'Free credits' },
    { name: '🎵 AIVA', url: 'https://www.aiva.ai/', quality: 4, free: '3/month' },
    { name: '🎵 Boomy', url: 'https://boomy.com/', quality: 3, free: 'Free' },
  ];

  return NextResponse.json(
    { isLink: true, provider: 'Music Links', prompt: finalPrompt, links },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}

export async function GET() {
  return NextResponse.json({ styles: Object.keys(STYLES), note: 'Returns music generator links' });
}
