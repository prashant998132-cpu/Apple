// lib/brain/groq.ts
// Groq Llama 3.3 — Ultra-fast responses for simple queries
// Free tier: Generous rate limits, 300+ tokens/sec

const GROQ_MODELS = {
  fast: 'llama-3.3-70b-versatile',
  instant: 'llama-3.1-8b-instant',   // Even faster for greetings
};

export interface GroqResponse {
  text: string;
  model: string;
  tokens: number;
  ms: number;
}

export async function askGroq(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userName?: string;
  language?: string;
  fast?: boolean;
}): Promise<GroqResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  const start = Date.now();

  if (!apiKey) {
    return {
      text: params.language === 'hindi' || params.language === 'mixed'
        ? 'GROQ_API_KEY set नहीं है। groq.com पर free account बनाओ।'
        : 'GROQ_API_KEY not configured. Create free account at groq.com',
      model: 'unavailable',
      tokens: 0,
      ms: 0
    };
  }

  const model = params.fast ? GROQ_MODELS.instant : GROQ_MODELS.fast;
  const isHindi = params.language === 'hindi' || params.language === 'mixed';
  const name = params.userName || 'User';

  const systemPrompt = isHindi
    ? `तुम JARVIS हो — ${name} का personal AI assistant। रीवा, MP में हो।
छोटे, sharp, helpful जवाब दो। Friendly रहो।
Hindi + Hinglish mix ठीक है। Emojis natural use करो।`
    : `You are JARVIS, ${name}'s personal AI assistant based in India.
Give short, sharp, helpful responses. Be friendly and conversational.`;

  const messages = [
    ...(params.history?.slice(-6) || []),
    { role: 'user' as const, content: params.message }
  ];

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 512,
        temperature: 0.7,
        stream: false
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Groq error ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      model,
      tokens: data.usage?.total_tokens || 0,
      ms: Date.now() - start
    };
  } catch (e: any) {
    // Groq failed — return error so caller can fallback to Gemini
    throw new Error(`Groq failed: ${e.message}`);
  }
}
