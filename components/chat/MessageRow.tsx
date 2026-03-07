'use client';
// MessageRow — uses msg.thinking field (from API) OR parses <think> from content
import ThinkBlock from './ThinkBlock';
import MessageBubble from './MessageBubble';

function parseThink(content: string): { thinking: string; answer: string } | null {
  const match = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (!match) return null;
  return { thinking: match[1].trim(), answer: content.replace(/<think>[\s\S]*?<\/think>/i, '').trim() };
}

export default function MessageRow({ msg }: { msg: any }) {
  const isUser = msg.role === 'user';

  if (!isUser) {
    // Prefer API-returned thinking field, fallback to parsing content
    const thinking = msg.thinking || '';
    const parsed = thinking ? null : parseThink(msg.content || '');
    const hasThinking = !!thinking || !!parsed;

    if (hasThinking) {
      const thinkText = thinking || parsed?.thinking || '';
      const answerText = thinking
        ? (msg.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        : (parsed?.answer || '');

      return (
        <div style={{ padding:'6px 10px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <div style={{
              width:22, height:22, borderRadius:5, flexShrink:0,
              background:'rgba(167,139,250,.12)', display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color:'#a78bfa', marginTop:2,
            }}>J</div>
            <div style={{ flex:1, maxWidth:'calc(100% - 30px)' }}>
              <ThinkBlock thinking={thinkText} answer={answerText} />
              {msg.toolsUsed?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
                  {msg.toolsUsed.map((t: string, i: number) => (
                    <span key={i} style={{ fontSize:9, padding:'2px 6px', borderRadius:10,
                      background:'rgba(0,229,255,.06)', color:'#4a7096' }}>{t}</span>
                  ))}
                </div>
              )}
              {msg.processingMs && (
                <div style={{ fontSize:9, color:'#0e2035', marginTop:4 }}>
                  {msg.model} · {msg.processingMs}ms
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return <MessageBubble msg={msg} />;
}
