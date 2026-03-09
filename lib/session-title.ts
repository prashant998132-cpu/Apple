// lib/session-title.ts — Auto-generate chat session titles
// Call after first AI response in a new chat

/** Extract a short title from the first user message */
export function generateSessionTitle(firstUserMessage: string): string {
  const msg = firstUserMessage.trim();

  // Strip markdown/special chars
  const clean = msg
    .replace(/[#*`_~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'New Chat';

  // If short enough, use as-is
  if (clean.length <= 40) return clean;

  // Try to find a natural break point
  const sentences = clean.split(/[.!?।]/);
  if (sentences[0] && sentences[0].length <= 50) {
    return sentences[0].trim();
  }

  // Hard truncate at word boundary ≤40 chars
  const words = clean.split(' ');
  let title = '';
  for (const w of words) {
    if ((title + ' ' + w).trim().length > 40) break;
    title = (title + ' ' + w).trim();
  }
  return title ? title + '…' : clean.slice(0, 40) + '…';
}

/** AI-generated title via our stream endpoint (optional, higher quality) */
export async function generateTitleFromAI(
  userMessage: string,
  assistantResponse: string
): Promise<string> {
  try {
    const prompt = `Generate a very short title (max 5 words, no quotes, no punctuation at end) for this conversation:
User: ${userMessage.slice(0, 200)}
Assistant: ${assistantResponse.slice(0, 200)}
Title:`;

    const res = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        mode: 'nano',
      }),
    });

    if (!res.ok) throw new Error('api fail');
    const data = await res.json();
    const title = (data.content ?? data.text ?? '').trim().replace(/^["']|["']$/g, '');
    return title || generateSessionTitle(userMessage);
  } catch {
    return generateSessionTitle(userMessage);
  }
}

/** Hook: call this in your chat component after first response */
export async function autoTitleSession(
  sessionId: string,
  firstUserMsg: string,
  firstAIMsg: string,
  saveTitle: (id: string, title: string) => Promise<void>
): Promise<string> {
  const title = await generateTitleFromAI(firstUserMsg, firstAIMsg);
  await saveTitle(sessionId, title);
  return title;
}
