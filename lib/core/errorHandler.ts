// lib/core/errorHandler.ts
// Global Error Handler — catches integration failures, timeouts, quota errors
// Never sends raw errors to frontend. Always structured safe response.

export type ErrorType =
  | 'timeout'
  | 'quota_exceeded'
  | 'no_key'
  | 'auth_failed'
  | 'network'
  | 'provider_down'
  | 'parse_error'
  | 'unknown';

export interface SafeError {
  ok: false;
  errorType: ErrorType;
  provider?: string;
  userMessage: string;       // Hindi-friendly message for user
  devMessage: string;        // Technical message for logs
  fallbackUsed?: string;
  retryable: boolean;
  ts: number;
}

export interface SafeSuccess<T = any> {
  ok: true;
  data: T;
  provider?: string;
  ts: number;
}

export type SafeResult<T = any> = SafeSuccess<T> | SafeError;

// ── Detect error type from raw error ──────────────────────
export function classifyError(err: unknown, provider?: string): SafeError {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const ts = Date.now();

  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('timed out')) {
    return { ok: false, errorType: 'timeout', provider, retryable: true, ts,
      userMessage: `${provider || 'सर्वर'} थोड़ा slow है, दूसरा try करता हूँ...`,
      devMessage: `Timeout: ${provider} — ${msg}` };
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('limit exceeded')) {
    return { ok: false, errorType: 'quota_exceeded', provider, retryable: false, ts,
      userMessage: `${provider || 'API'} की limit खत्म हो गई, alternative use करता हूँ`,
      devMessage: `Quota exceeded: ${provider}` };
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return { ok: false, errorType: 'auth_failed', provider, retryable: false, ts,
      userMessage: `${provider || 'API'} key invalid है, Settings में check करो`,
      devMessage: `Auth failed: ${provider} — ${msg}` };
  }
  if (msg.includes('no_key') || msg.includes('no key') || msg.includes('missing key')) {
    return { ok: false, errorType: 'no_key', provider, retryable: false, ts,
      userMessage: `${provider || 'इस feature'} का API key नहीं है — Settings में add करो`,
      devMessage: `No key: ${provider}` };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('enotfound')) {
    return { ok: false, errorType: 'network', provider, retryable: true, ts,
      userMessage: 'Internet connection check करो',
      devMessage: `Network error: ${provider} — ${msg}` };
  }
  if (msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('service unavailable')) {
    return { ok: false, errorType: 'provider_down', provider, retryable: true, ts,
      userMessage: `${provider || 'Service'} अभी down है, alternative try करता हूँ`,
      devMessage: `Provider down: ${provider} — ${msg}` };
  }
  return { ok: false, errorType: 'unknown', provider, retryable: true, ts,
    userMessage: 'कुछ गड़बड़ हुई, दूसरा तरीका try करता हूँ',
    devMessage: `Unknown error: ${provider} — ${msg}` };
}

// ── Wrap any async fn with safe error handling ─────────────
export async function safeRun<T>(
  fn: () => Promise<T>,
  provider?: string,
): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, provider, ts: Date.now() };
  } catch (err) {
    return classifyError(err, provider);
  }
}

// ── Try providers in order, return first success ───────────
export async function tryProviders<T>(
  providers: Array<{ id: string; fn: () => Promise<T> }>,
): Promise<{ result: T; provider: string; tried: string[]; errors: SafeError[] }> {
  const tried: string[] = [];
  const errors: SafeError[] = [];

  for (const { id, fn } of providers) {
    tried.push(id);
    const result = await safeRun(fn, id);
    if (result.ok) {
      return { result: result.data, provider: id, tried, errors };
    }
    errors.push(result as any);
    // Don't retry quota/auth errors for this provider
    // Continue to next
  }

  // All failed
  const lastError = errors[errors.length - 1];
  throw new Error(lastError?.devMessage || `All ${tried.length} providers failed: ${tried.join(', ')}`);
}

// ── Format error for API response ─────────────────────────
export function errorResponse(err: SafeError | unknown, fallbackMessage?: string) {
  if (err && typeof err === 'object' && 'ok' in err && !(err as any).ok) {
    const e = err as SafeError;
    return {
      error: true,
      errorType: e.errorType,
      message: e.userMessage,
      provider: e.provider,
      retryable: e.retryable,
    };
  }
  return {
    error: true,
    errorType: 'unknown',
    message: fallbackMessage || 'कुछ गड़बड़ हुई। फिर try करो।',
    retryable: true,
  };
}

// ── Log error (server-side) ────────────────────────────────
export function logError(err: SafeError, context?: string) {
  const prefix = context ? `[${context}]` : '[JARVIS]';
  console.error(`${prefix} ${err.errorType.toUpperCase()}: ${err.devMessage}`, {
    provider: err.provider,
    retryable: err.retryable,
    ts: new Date(err.ts).toISOString(),
  });
}
