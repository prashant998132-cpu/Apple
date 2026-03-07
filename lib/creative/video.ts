// lib/creative/video.ts -- Video generation links + basic tools
// No truly free unlimited video API exists -- best strategy: smart links + CapCut

export interface VideoOptions { prompt: string; duration?: number; style?: string; }
export interface VideoResult { url?: string; service: string; link?: string; prompt: string; thumbnailUrl?: string; }

// Runway -- 125 free credits
export async function videoRunway(o: VideoOptions): Promise<VideoResult|null> {
  const k = process.env.RUNWAY_API_KEY;
  if(!k) return null;
  try {
    const res = await fetch("https://api.runwayml.com/v1/image_to_video", {
      method:"POST", headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json","X-Runway-Version":"2024-11-06"},
      body:JSON.stringify({promptText:o.prompt,duration:o.duration||5,ratio:"1280:720",model:"gen3a_turbo"}),
      signal:AbortSignal.timeout(60000)
    });
    if(!res.ok) return null;
    const d = await res.json();
    return {url:d.output?.[0], service:"Runway Gen-3", prompt:o.prompt};
  } catch { return null; }
}

// Deep links to free video sites
export function getVideoLinks(o: VideoOptions) {
  const enc = encodeURIComponent(o.prompt);
  return {
    runway: "https://app.runwayml.com/",
    pika: "https://pika.art/create",
    kling: "https://kling.kuaishou.com/",
    hailuo: "https://hailuoai.video/",
    luma: "https://lumalabs.ai/dream-machine",
    veed: "https://www.veed.io/tools/ai-video-generator?text="+enc,
    invideo: "https://invideo.io/ai/?prompt="+enc,
    capcut: "https://www.capcut.com/ai-tool/text-to-video",
    pixabay_video: "https://pixabay.com/videos/search/?q="+enc,
    pexels_video: "https://www.pexels.com/search/videos/"+enc+"/",
  };
}

export async function generateVideo(o: VideoOptions): Promise<VideoResult> {
  const r = await videoRunway(o);
  if(r) return r;
  const links = getVideoLinks(o);
  return {link:links.pika, service:"Pika Labs (link)", prompt:o.prompt};
}
