// lib/creative/tts.ts -- 5-layer TTS: ElevenLabs -> Google -> Azure -> AIMLAPI -> Web Speech
export interface TTSOptions { text: string; lang?: string; voice?: string; speed?: number; quality?: string; }
export interface TTSResult { audioBase64?: string; audioUrl?: string; service: string; voice: string; }

function getMonthKey(s: string): string { return "tts_" + s + "_" + new Date().toISOString().slice(0,7); }
function getUsed(s: string): number { if(typeof window==="undefined") return 0; return parseInt(localStorage.getItem(getMonthKey(s))||"0"); }
function addUsed(s: string, n: number) { if(typeof window==="undefined") return; localStorage.setItem(getMonthKey(s), String(getUsed(s)+n)); }

// 1. ElevenLabs -- 10K chars/month free
export async function ttsElevenLabs(o: TTSOptions): Promise<TTSResult|null> {
  const k = process.env.ELEVENLABS_API_KEY;
  if(!k || getUsed("elevenlabs")+o.text.length > 9800) return null;
  const vid = o.lang==="en" ? "EXAVITQu4vr4xnSDxMaL" : "pNInz6obpgDQGcFmaJgB";
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+vid, {
      method:"POST", headers:{"xi-api-key":k,"Content-Type":"application/json"},
      body:JSON.stringify({text:o.text,model_id:"eleven_multilingual_v2",voice_settings:{stability:0.5,similarity_boost:0.75,speed:o.speed||1}}),
      signal:AbortSignal.timeout(15000)
    });
    if(!res.ok) return null;
    const buf = await res.arrayBuffer();
    addUsed("elevenlabs", o.text.length);
    return {audioBase64:"data:audio/mpeg;base64,"+Buffer.from(buf).toString("base64"),service:"ElevenLabs",voice:vid};
  } catch { return null; }
}

// 2. Google Cloud TTS -- 1M chars/month free
export async function ttsGoogle(o: TTSOptions): Promise<TTSResult|null> {
  const k = process.env.GOOGLE_CLOUD_TTS_KEY;
  if(!k) return null;
  const name = o.lang==="en" ? "en-US-Wavenet-D" : "hi-IN-Wavenet-A";
  const lang = o.lang==="en" ? "en-US" : "hi-IN";
  try {
    const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key="+k, {
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({input:{text:o.text},voice:{languageCode:lang,name},audioConfig:{audioEncoding:"MP3",speakingRate:o.speed||1}}),
      signal:AbortSignal.timeout(10000)
    });
    if(!res.ok) return null;
    const d = await res.json();
    addUsed("google", o.text.length);
    return {audioBase64:"data:audio/mp3;base64,"+d.audioContent,service:"Google TTS",voice:name};
  } catch { return null; }
}

// 3. Azure TTS -- 500K chars/month free
export async function ttsAzure(o: TTSOptions): Promise<TTSResult|null> {
  const k = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION||"eastus";
  if(!k || getUsed("azure")+o.text.length > 490000) return null;
  const voice = o.lang==="en" ? "en-US-JennyNeural" : "hi-IN-SwaraNeural";
  const ssml = "<speak version='1.0' xml:lang='"+(o.lang==="hi"?"hi-IN":"en-US")+"'><voice name='"+voice+"'><prosody rate='"+String(o.speed||1)+"'>" + o.text.replace(/[<>&]/g,(c:string)=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]||c)) + "</prosody></voice></speak>";
  try {
    const res = await fetch("https://"+region+".tts.speech.microsoft.com/cognitiveservices/v1", {
      method:"POST",
      headers:{"Ocp-Apim-Subscription-Key":k,"Content-Type":"application/ssml+xml","X-Microsoft-OutputFormat":"audio-24khz-48kbitrate-mono-mp3"},
      body:ssml, signal:AbortSignal.timeout(10000)
    });
    if(!res.ok) return null;
    const buf = await res.arrayBuffer();
    addUsed("azure", o.text.length);
    return {audioBase64:"data:audio/mp3;base64,"+Buffer.from(buf).toString("base64"),service:"Azure TTS",voice};
  } catch { return null; }
}

// 4. AIMLAPI TTS
export async function ttsAIMLAPI(o: TTSOptions): Promise<TTSResult|null> {
  const k = process.env.AIMLAPI_KEY;
  if(!k) return null;
  try {
    const res = await fetch("https://api.aimlapi.com/tts",{
      method:"POST",headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},
      body:JSON.stringify({text:o.text,language:o.lang==="hi"?"hi":"en",voice:"female"}),
      signal:AbortSignal.timeout(10000)
    });
    if(!res.ok) return null;
    const d = await res.json();
    return {audioUrl:d.url||d.audio_url,service:"AIMLAPI TTS",voice:"female"};
  } catch { return null; }
}

// Main -- server side
export async function speak(o: TTSOptions): Promise<TTSResult|null> {
  if(o.quality !== "fast") {
    const r = await ttsElevenLabs(o) || await ttsGoogle(o) || await ttsAzure(o) || await ttsAIMLAPI(o);
    if(r) return r;
  }
  return {service:"Web Speech API",voice:"browser"};
}

export function getUsageStatus() {
  return {
    elevenlabs:{used:getUsed("elevenlabs"),limit:10000},
    google:{used:getUsed("google"),limit:1000000},
    azure:{used:getUsed("azure"),limit:500000},
  };
}
