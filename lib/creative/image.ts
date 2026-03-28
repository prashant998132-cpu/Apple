// lib/creative/image.ts -- Multi-provider image generation
// Puter.js (unlimited) -> Gemini Imagen -> HuggingFace Flux -> Pollinations -> Craiyon link

export interface ImageOptions {
  prompt: string; style?: string; width?: number; height?: number; quality?: string;
}
export interface ImageResult {
  url?: string; base64?: string; service: string; prompt: string; openLink?: string;
}

// Translate Hindi prompt to English for better results
async function translatePrompt(prompt: string): Promise<string> {
  const hasHindi = /[\u0900-\u097F]/.test(prompt);
  if(!hasHindi) return prompt;
  try {
    const res = await fetch("https://api.mymemory.translated.net/get?q="+encodeURIComponent(prompt)+"&langpair=hi|en", {signal:AbortSignal.timeout(5000)});
    const d = await res.json();
    return d.responseData?.translatedText || prompt;
  } catch { return prompt; }
}

// 1. Pollinations.ai -- truly unlimited, no key
export async function imagePollinations(o: ImageOptions): Promise<ImageResult|null> {
  try {
    const p = await translatePrompt(o.prompt);
    const styled = p + (o.style ? ", "+o.style+" style" : "") + ", high quality, detailed";
    const w = o.width||768; const h = o.height||512;
    const url = "https://image.pollinations.ai/prompt/"+encodeURIComponent(styled)+"?width="+w+"&height="+h+"&nologo=true&seed="+Date.now();
    const res = await fetch(url, {signal:AbortSignal.timeout(20000)});
    if(!res.ok) return null;
    const buf = await res.arrayBuffer();
    const b64 = "data:image/jpeg;base64,"+Buffer.from(buf).toString("base64");
    return {base64:b64, url, service:"Pollinations.ai", prompt:o.prompt};
  } catch { return null; }
}

// 2. Gemini Imagen -- generous free tier
export async function imageGemini(o: ImageOptions): Promise<ImageResult|null> {
  const k = process.env.GEMINI_API_KEY;
  if(!k) return null;
  try {
    const p = await translatePrompt(o.prompt);
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key="+k, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({instances:[{prompt:p+(o.style?", "+o.style:"")}],parameters:{sampleCount:1,aspectRatio:"16:9"}}),
      signal:AbortSignal.timeout(30000)
    });
    if(!res.ok) return null;
    const d = await res.json();
    const b64data = d.predictions?.[0]?.bytesBase64Encoded;
    if(!b64data) return null;
    return {base64:"data:image/png;base64,"+b64data, service:"Gemini Imagen", prompt:o.prompt};
  } catch { return null; }
}

// 3. HuggingFace FLUX -- free with token
export async function imageFlux(o: ImageOptions): Promise<ImageResult|null> {
  const k = process.env.HUGGINGFACE_TOKEN;
  if(!k) return null;
  try {
    const p = await translatePrompt(o.prompt);
    const res = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
      method:"POST", headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},
      body:JSON.stringify({inputs:p+(o.style?", "+o.style:"")}),
      signal:AbortSignal.timeout(60000)
    });
    if(!res.ok) return null;
    const buf = await res.arrayBuffer();
    return {base64:"data:image/jpeg;base64,"+Buffer.from(buf).toString("base64"), service:"HuggingFace FLUX", prompt:o.prompt};
  } catch { return null; }
}

// 4. AIMLAPI image -- free tier
export async function imageAIMLAPI(o: ImageOptions): Promise<ImageResult|null> {
  const k = process.env.AIMLAPI_KEY;
  if(!k) return null;
  try {
    const p = await translatePrompt(o.prompt);
    const res = await fetch("https://api.aimlapi.com/images/generations", {
      method:"POST", headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},
      body:JSON.stringify({model:"flux/schnell",prompt:p,image_size:"landscape_16_9",num_inference_steps:4}),
      signal:AbortSignal.timeout(30000)
    });
    if(!res.ok) return null;
    const d = await res.json();
    const imgUrl = d.images?.[0]?.url || d.data?.[0]?.url;
    if(!imgUrl) return null;
    return {url:imgUrl, service:"AIMLAPI Flux", prompt:o.prompt};
  } catch { return null; }
}

// External site links (no API, open in browser)
export function getExternalLinks(prompt: string) {
  const enc = encodeURIComponent(prompt);
  return {
    perchance: "https://perchance.org/ai-text-to-image-generator?prompt="+enc,
    craiyon: "https://www.craiyon.com/?prompt="+enc,
    bing: "https://www.bing.com/images/create?q="+enc,
    leonardo: "https://app.leonardo.ai/",
    ideogram: "https://ideogram.ai/",
    playground: "https://playground.ai/",
  };
}

// Main orchestrator
export async function generateImage(o: ImageOptions): Promise<ImageResult> {
  const r = await imagePollinations(o) || await imageGemini(o) || await imageFlux(o) || await imageAIMLAPI(o);
  if(r) return r;
  // All failed -- return Perchance link
  const links = getExternalLinks(o.prompt);
  return {openLink:links.perchance, service:"Perchance AI (link)", prompt:o.prompt};
}
