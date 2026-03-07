// app/api/image/route.ts
// IMAGE CASCADE — Best first → auto fallback
// 1. Puter.js          (unlimited, no key — client handles this)
// 2. Gemini Imagen 3   (best quality, existing key, free)
// 3. HuggingFace FLUX  (best open model, rate limited)
// 4. AIMLAPI Flux      (free tier)
// 5. DeepAI            (free tier, needs key)
// 6. Pollinations.ai   (unlimited, no key, always works)
// Links: Craiyon, Perchance, Bing, Leonardo, Ideogram, Playground, Recraft

import { NextRequest, NextResponse } from 'next/server';

const STYLE_MAP: Record<string,string> = {
  realistic:   'hyperrealistic photography, 8K, DSLR, sharp, natural lighting',
  anime:       'anime art, Studio Ghibli style, vibrant, detailed illustration',
  artistic:    'oil painting, masterpiece, museum quality, textured brushwork',
  cinematic:   'cinematic shot, anamorphic lens, dramatic lighting, movie still',
  '3d':        '3D render, Octane render, ray tracing, photorealistic materials',
  bollywood:   'Bollywood poster, colorful, Indian aesthetic, dramatic composition',
  nature:      'Indian landscape, golden hour, wildlife photography, stunning',
  minimal:     'minimalist flat design, clean lines, simple, modern vector art',
  portrait:    'professional portrait, studio lighting, sharp focus, 8K detail',
  watercolor:  'watercolor painting, soft washes, artistic, beautiful texture',
};

const EXTERNAL_LINKS = (prompt: string) => [
  { name:'🎨 Perchance AI',   url:'https://perchance.org/ai-text-to-image-generator',          limit:'Unlimited free', quality:4 },
  { name:'🎨 Bing Creator',   url:`https://www.bing.com/images/create?q=${encodeURIComponent(prompt)}`, limit:'Unlimited free', quality:4 },
  { name:'🎨 Craiyon',        url:`https://www.craiyon.com/?prompt=${encodeURIComponent(prompt)}`,       limit:'Unlimited free', quality:3 },
  { name:'🎨 Leonardo AI',    url:'https://app.leonardo.ai/',                                   limit:'150/day free',   quality:5 },
  { name:'🎨 Ideogram 2.0',   url:'https://ideogram.ai/',                                       limit:'25/day free',    quality:5 },
  { name:'🎨 Playground AI',  url:'https://playground.ai/',                                     limit:'100/day free',   quality:4 },
  { name:'🎨 Recraft',        url:'https://www.recraft.ai/',                                    limit:'30/day free',    quality:4 },
  { name:'🎨 Canva AI',       url:'https://www.canva.com/ai-image-generator/',                  limit:'50/day free',    quality:4 },
  { name:'🎨 Freepik AI',     url:'https://www.freepik.com/ai/image-generator',                limit:'10/day free',    quality:4 },
  { name:'🎨 DeepAI Web',     url:`https://deepai.org/machine-learning-model/text2img?text=${encodeURIComponent(prompt)}`, limit:'Free',           quality:3 },
];

// ── 2. Gemini Imagen 3 ───────────────────────────────────
async function gemini(prompt: string) {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${key}`,
    { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instances:[{prompt}], parameters:{sampleCount:1,aspectRatio:'1:1'} }),
      signal: AbortSignal.timeout(35000) }
  );
  if (!res.ok) throw new Error('gemini_' + res.status);
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('no_data');
  return { imageBase64: b64, imageUrl: `data:image/png;base64,${b64}`, mimeType:'image/png', provider:'Google Gemini Imagen 3' };
}

// ── 3. HuggingFace FLUX.1-schnell ───────────────────────
async function flux(prompt: string) {
  const token = process.env.HUGGINGFACE_TOKEN;
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    { method:'POST', headers, body:JSON.stringify({ inputs:prompt }), signal:AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error('flux_' + res.status);
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { imageBase64: b64, imageUrl:`data:image/jpeg;base64,${b64}`, mimeType:'image/jpeg', provider:'HuggingFace FLUX.1-schnell' };
}

// ── 4. AIMLAPI Flux ──────────────────────────────────────
async function aimlapi(prompt: string) {
  const key = process.env.AIMLAPI_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api.aimlapi.com/v2/generate/image', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model:'flux/schnell', prompt, image_size:{ width:1024, height:1024 } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error('aiml_' + res.status);
  const data = await res.json();
  const url = data.images?.[0]?.url;
  if (!url) throw new Error('no_url');
  return { imageUrl: url, provider:'AIMLAPI Flux' };
}

// ── 5. DeepAI ────────────────────────────────────────────
async function deepai(prompt: string) {
  const key = process.env.DEEPAI_KEY;
  if (!key) throw new Error('no_key');
  const form = new FormData(); form.append('text', prompt);
  const res = await fetch('https://api.deepai.org/api/text2img',
    { method:'POST', headers:{'api-key':key}, body:form, signal:AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error('deepai_' + res.status);
  const data = await res.json();
  if (!data.output_url) throw new Error('no_url');
  return { imageUrl: data.output_url, provider:'DeepAI' };
}

// ── 6. Pollinations.ai (unlimited, no key) ───────────────
function pollinations(prompt: string, style?: string) {
  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
  return { imageUrl: url, provider:'Pollinations.ai (Unlimited Free)' };
}

// ════════════════════════════════════════════════════════
// POST — Main cascade
// ════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { prompt, style, provider: pref } = await req.json();
  if (!prompt) return NextResponse.json({ error:'No prompt' }, { status:400 });

  // Enhance prompt with style + India context
  let enhanced = prompt;
  if (style && STYLE_MAP[style]) enhanced += ', ' + STYLE_MAP[style];
  if (/nadan|rewa|mp|india|indian|bharat/i.test(prompt)) enhanced += ', India, authentic, detailed';
  enhanced += ', high quality, 4K';

  const tried: string[] = [];

  // NOTE: Puter.js (#1) is handled client-side — browser calls it directly
  // Server cascade starts from #2 Gemini
  type P = { id:string; fn:()=>Promise<any> };
  const all: P[] = [
    { id:'gemini',      fn:()=>gemini(enhanced)      },
    { id:'flux',        fn:()=>flux(enhanced)        },
    { id:'aimlapi',     fn:()=>aimlapi(enhanced)     },
    { id:'deepai',      fn:()=>deepai(enhanced)      },
  ];

  const ordered = pref ? [...all.filter(p=>p.id===pref), ...all.filter(p=>p.id!==pref)] : all;

  for (const { id, fn } of ordered) {
    tried.push(id);
    try {
      const result = await fn();
      return NextResponse.json({ ...result, prompt:enhanced, style, triedProviders:tried, externalLinks:EXTERNAL_LINKS(prompt) });
    } catch { /* next */ }
  }

  // Final: Pollinations (always works, unlimited)
  tried.push('pollinations');
  return NextResponse.json({ ...pollinations(enhanced, style), prompt:enhanced, style, triedProviders:tried, externalLinks:EXTERNAL_LINKS(prompt) });
}

// GET — Provider status + external links
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('prompt') || 'beautiful landscape';
  return NextResponse.json({
    providers: [
      { id:'puter',       name:'Puter.js (Browser)',      limit:'Unlimited',       hasKey:true,                              quality:4, note:'Client-side only' },
      { id:'gemini',      name:'Gemini Imagen 3',         limit:'Generous free',   hasKey:!!process.env.NEXT_PUBLIC_GEMINI_API_KEY, quality:5 },
      { id:'flux',        name:'HuggingFace FLUX.1',      limit:'Rate limited',    hasKey:!!process.env.HUGGINGFACE_TOKEN,   quality:5 },
      { id:'aimlapi',     name:'AIMLAPI Flux',            limit:'Free tier',       hasKey:!!process.env.AIMLAPI_KEY,         quality:4 },
      { id:'deepai',      name:'DeepAI',                  limit:'Free tier',       hasKey:!!process.env.DEEPAI_KEY,          quality:3 },
      { id:'pollinations',name:'Pollinations.ai',         limit:'Unlimited',       hasKey:true,                              quality:3 },
    ],
    externalLinks: EXTERNAL_LINKS(p),
  });
}
