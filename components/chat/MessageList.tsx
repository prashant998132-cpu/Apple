'use client';
// components/chat/MessageList.tsx — with per-message 🔊 TTS button
// JARVIS v10.8 — TTS button added

import { useState, useRef, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

// ─── TTS helpers ─────────────────────────────────────────────

async function speakViaTTS(text: string): Promise<void> {
  // 1. Try Microsoft Edge TTS (via our TTS API)
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 1000) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
      return;
    }
  } catch {/* fallthrough */}

  // 2. Web Speech API fallback
  if ('speechSynthesis' in window) {
    const utt = new SpeechSynthesisUtterance(text.slice(0, 500));
    utt.lang  = 'en-IN';
    utt.rate  = 1.05;
    speechSynthesis.speak(utt);
  }
}

// ─── Single Message ───────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const isUser = msg.role === 'user';

  const handleTTS = useCallback(async () => {
    if (ttsState !== 'idle') return;
    setTtsState('loading');
    try {
      await speakViaTTS(msg.content);
      setTtsState('playing');
      // reset after 3s (rough estimate)
      setTimeout(() => setTtsState('idle'), 3000);
    } catch {
      setTtsState('idle');
    }
  }, [msg.content, ttsState]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
        padding: '0 12px',
      }}
    >
      {/* Bubble */}
      <div
        style={{
          maxWidth: '82%',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
            : 'rgba(255,255,255,0.07)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
          fontSize: '15px',
          lineHeight: '1.5',
          color: '#fff',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          position: 'relative',
        }}
      >
        {msg.content}
        {msg.isStreaming && (
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '14px',
              background: '#60a5fa',
              marginLeft: '4px',
              borderRadius: '2px',
              animation: 'blink 0.7s infinite',
              verticalAlign: 'middle',
            }}
          />
        )}
      </div>

      {/* Action row — only for assistant messages */}
      {!isUser && !msg.isStreaming && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginTop: '4px',
            marginLeft: '4px',
          }}
        >
          {/* TTS Button */}
          <button
            onClick={handleTTS}
            title="Listen"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '4px 8px',
              cursor: ttsState === 'idle' ? 'pointer' : 'default',
              fontSize: '13px',
              color: ttsState === 'playing' ? '#60a5fa' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {ttsState === 'loading' ? '⏳' : ttsState === 'playing' ? '🔊' : '🔈'}
          </button>

          {/* Copy Button */}
          <CopyButton text={msg.content} />
        </div>
      )}

      {/* Timestamp */}
      {msg.timestamp && (
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.25)',
            marginTop: '2px',
            marginLeft: isUser ? '0' : '4px',
            marginRight: isUser ? '4px' : '0',
          }}
        >
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {/* noop */}
      }}
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '13px',
        color: copied ? '#34d399' : 'rgba(255,255,255,0.6)',
        transition: 'color 0.2s',
      }}
    >
      {copied ? '✅' : '📋'}
    </button>
  );
}

// ─── Loading Indicator ────────────────────────────────────────

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px 12px' }}>
      <div
        style={{
          display: 'flex',
          gap: '5px',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '18px 18px 18px 4px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#60a5fa',
              display: 'inline-block',
              animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <style>{`
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
      `}</style>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '16px',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages
          .filter((m) => m.role !== 'system')
          .map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

        {isLoading && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>
    </>
  );
}
