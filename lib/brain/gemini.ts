import { detectComplexity, TOKEN_BUDGET, getToolsForMessage, compressSystemPrompt, trimHistory } from '../core/tokenBudget'
// lib/brain/gemini.ts
// Gemini 2.0 Flash — Main JARVIS Brain with Native Function Calling
// Calls tools automatically, loops until done, returns final answer

import { toGeminiFunctions, getToolByName } from '../../config/tools.config';
import * as NoKeyTools from '../tools/no-key';
import * as FreeKeyTools from '../tools/free-key';
import type { GeminiMessage, UserProfile, ToolResult } from '../../types/jarvis.types';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_ROUNDS = 5;

// ─── System Prompt ────────────────────────────────────────
function buildSystemPrompt(user: UserProfile, memoryContext?: string): string {
  const now = new Date().toLocaleString('hi-IN', { timeZone: user.timezone || 'Asia/Kolkata' });
  const isHindi = user.language !== 'english';

  let prompt = `Tum JARVIS ho — ${user.name || 'User'} ka personal autonomous AI assistant.
Location: ${user.location?.city || 'Nadan, Maihar'}, MP, India | Time: ${now} IST

TUMHARA KAAM:
• Tools KHUD use karo — permission mat maango
• Pehle karo, phir bolo — action first, explanation later  
• ${isHindi ? 'Hindi + Hinglish mein baat karo' : 'Respond in English'}
• Short, sharp, useful — bhashan mat do
• User ki location context yaad rakho (GPS se milegi)
• Emojis natural use karo

TOOL USE RULES:
• Fact questions → always tool use karo (0 tokens waste)
• Multiple tools ek saath call kar sakte ho
• Tool fail ho → gracefully handle karo, user ko bolo`;

  if (memoryContext) {
    prompt += `\n\nMEMORY CONTEXT:\n${memoryContext}`;
  }

  return prompt;
}

// ─── Tool Executor ────────────────────────────────────────
async function executeTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  const start = Date.now();
  try {
    // Try no-key tools first
    const noKey = NoKeyTools as any;
    if (typeof noKey[name] === 'function') {
      const data = await noKey[name](args);
      return { success: true, toolName: name, data, executionMs: Date.now() - start };
    }

    // Try free-key tools
    const freeKey = FreeKeyTools as any;
    if (typeof freeKey[name] === 'function') {
      const data = await freeKey[name](args);
      return { success: true, toolName: name, data, executionMs: Date.now() - start };
    }

    return { success: false, toolName: name, data: null, error: `Tool "${name}" not found` };
  } catch (e: any) {
    return { success: false, toolName: name, data: null, error: e.message, executionMs: Date.now() - start };
  }
}

// ─── Main Gemini Call ─────────────────────────────────────
export interface GeminiResponse {
  reply: string;
  toolsUsed: string[];
  toolResults: Record<string, any>;
  rounds: number;
  tokens: number;
  ms: number;
  model: string;
}

export async function askGemini(params: {
  message: string;
  history: GeminiMessage[];
  user: UserProfile;
  memoryContext?: string;
  toolNames?: string[];   // Restrict to specific tools (optional)
}): Promise<GeminiResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const start = Date.now();

  if (!apiKey) {
    return {
      reply: params.user.language === 'hindi'
        ? 'GEMINI_API_KEY set नहीं है। aistudio.google.com पर free key लो।'
        : 'GEMINI_API_KEY not configured. Get free key at aistudio.google.com',
      toolsUsed: [], toolResults: {}, rounds: 0, tokens: 0, ms: 0, model: 'unavailable'
    };
  }

  const toolsUsed: string[] = [];
  const toolResults: Record<string, any> = {};
  let totalTokens = 0;
  let finalReply = '';

  // Build messages
  const messages: GeminiMessage[] = [
    ...params.history.slice(-8),
    { role: 'user', parts: [{ text: params.message }] }
  ];

  // Get tool definitions (all or filtered)
  const allTools = toGeminiFunctions();
  // Tool compression — only inject relevant tools, not all 46
  const cx = detectComplexity(params.message || '')
  const budget = TOKEN_BUDGET[cx]
  const allToolNames = allTools.map(t => t.name)
  const relevantNames = getToolsForMessage(params.message || '', allToolNames, budget.toolSlots)
  const tools = params.toolNames
    ? allTools.filter(t => params.toolNames!.includes(t.name))
    : (budget.toolSlots === 0 ? [] : allTools.filter(t => relevantNames.includes(t.name)));

  const systemPrompt = buildSystemPrompt(params.user, params.memoryContext);

  // ── Agentic Loop ──────────────────────────────────────
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const body = {
      contents: messages,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [{ functionDeclarations: tools }],
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: TOKEN_BUDGET[detectComplexity(params.message || '')].maxTokens,
        topP: 0.95,
      }
    };

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Gemini API: ${err.error?.message || res.status}`);
    }

    const data = await res.json();
    totalTokens += data.usageMetadata?.totalTokenCount || 0;

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const finishReason = candidate?.finishReason;

    // Extract text
    const textPart = parts.find((p: any) => p.text);
    if (textPart?.text) finalReply = textPart.text;

    // Extract function calls
    const fnCalls = parts.filter((p: any) => p.functionCall);

    // No more tool calls or done
    if (fnCalls.length === 0 || finishReason === 'STOP') break;

    // Add Gemini's response to history
    messages.push({ role: 'model', parts });

    // Execute ALL tool calls in parallel
    const execResults = await Promise.all(
      fnCalls.map(async (part: any) => {
        const { name, args } = part.functionCall;
        toolsUsed.push(name);
        const result = await executeTool(name, args || {});
        toolResults[name] = result.data;
        return { name, result };
      })
    );

    // Add tool results back
    messages.push({
      role: 'user',
      parts: execResults.map(({ name, result }) => ({
        functionResponse: {
          name,
          response: result.success
            ? { content: result.data }
            : { error: result.error || 'Tool failed' }
        }
      }))
    });
  }

  return {
    reply: finalReply || (params.user.language === 'hindi'
      ? 'माफ करना, कुछ गड़बड़ हो गई।'
      : 'Something went wrong. Please try again.'),
    toolsUsed: [...new Set(toolsUsed)],
    toolResults,
    rounds: Math.min(MAX_ROUNDS, toolsUsed.length + 1),
    tokens: totalTokens,
    ms: Date.now() - start,
    model: GEMINI_MODEL
  };
}
