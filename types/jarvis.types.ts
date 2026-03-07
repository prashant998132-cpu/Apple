// types/jarvis.types.ts — All JARVIS TypeScript Types

// ── User & Profile ────────────────────────────────────────
export interface UserProfile {
  userId: string;
  name?: string;
  language: 'hindi' | 'english' | 'mixed';
  location: { city: string; lat: number; lon: number; };
  timezone: string;
  preferences: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

// ── Message ───────────────────────────────────────────────
export interface JarvisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolsUsed?: string[];
  richData?: RichData;
  processingMs?: number;
  model?: string;
  offline?: boolean;
}

// ── Rich Data (UI Cards) ──────────────────────────────────
export interface RichData {
  type: 'weather' | 'news' | 'youtube' | 'image' | 'movie' |
        'crypto' | 'train' | 'recipe' | 'nasa' | 'photo' |
        'video' | 'exchange' | 'holiday' | 'airquality' | 'multi';
  data: any;
}

// ── Tool Types ────────────────────────────────────────────
export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  requiresKey: boolean;
  envKey?: string;
  autoTrigger: string[];
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export type ToolCategory =
  | 'weather' | 'time' | 'knowledge' | 'news' | 'entertainment'
  | 'finance' | 'location' | 'image-gen' | 'video' | 'productivity'
  | 'india' | 'fun' | 'science';

export interface ToolResult {
  success: boolean;
  toolName: string;
  data: any;
  error?: string;
  cached?: boolean;
  executionMs?: number;
}

// ── Router Decision ───────────────────────────────────────
export interface RouterDecision {
  brain: 'gemini' | 'groq' | 'direct';
  tools: string[];
  complexity: number;        // 1-10
  language: 'hindi' | 'english' | 'mixed';
  tone: 'casual' | 'formal' | 'emotional' | 'technical';
  needsSearch: boolean;
  needsImage: boolean;
  needsVideo: boolean;
  isLocal: boolean;          // Rewa/India specific
  estimatedTokens: number;
}

// ── Gemini Message Format ─────────────────────────────────
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    functionCall?: { name: string; args: Record<string, any> };
    functionResponse?: { name: string; response: any };
    inlineData?: { mimeType: string; data: string };
  }>;
}

// ── Proactive Alert ───────────────────────────────────────
export interface ProactiveAlert {
  id: string;
  type: 'morning' | 'weather' | 'train' | 'festival' | 'power' | 'reminder';
  title: string;
  body: string;
  data?: any;
  scheduledFor: number;
  sent: boolean;
}

// ── Memory ────────────────────────────────────────────────
export interface MemoryRecord {
  id: string;
  userId: string;
  type: 'chat' | 'preference' | 'fact' | 'reminder' | 'personal';
  content: string;
  summary?: string;
  importance: number;   // 1-10
  tags: string[];
  language: string;
  timestamp: number;
  expiresAt?: number;
  synced: boolean;
}

// ── API Response ──────────────────────────────────────────
export interface JarvisApiResponse {
  success: boolean;
  reply: string;
  richData?: RichData;
  toolsUsed: string[];
  processingMs: number;
  model: string;
  language: string;
  offline?: boolean;
  error?: string;
}
