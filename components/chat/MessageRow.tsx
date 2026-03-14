'use client';
import { useState } from 'react';
import ThinkBlock from './ThinkBlock';
import MessageBubble from './MessageBubble';

function parseThink(content: string): { thinking: string; answer: string } | null {
  const match = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (!match) return null;
  return { thinking: match[1].trim(), answer: content.replace(/<think>[\s\S]*?<\/think>/i, '').trim() };
}

const REACTION_EMOJIS = ['👍','⭐','📌','😂','🔥'];

function ReactionBar({ msgId, onReact }: { msgId: string; onReact?: (id: string, e: string) => void }) {
  const [show, setShow] = useState(false);
  if (!onReact) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, marginTop:4, position:'relative' }}>
      <button onClick={() => setShow(p=>!p)} style={{ background:'none', border:'none', fontSize:11, color:'#2a4a5e', cursor:'pointer', padding:'0 4px', borderRadius:6, opacity:.6 }} title="React">+😊</button>
      {show && (
        <>
          <div onClick={() => setShow(false)} style={{ position:'fixed', inset:0, zIndex:99 }}/>
          <div style={{ position:'absolute', bottom:20, left:0, zIndex:100, display:'flex', gap:4, background:'#071828', border:'1px solid rgba(0,229,255,.15)', borderRadius:10, padding:'4px 8px', boxShadow:'0 4px 16px rgba(0,0,0,.6)' }}>
            {REACTION_EMOJIS.map(e => (
              <button key={e} onClick={() => { onReact(msgId, e); setShow(false); }} style={{ background:'none', border:'none', fontSize:16, cursor:'pointer', padding:'2px', borderRadius:6, transition:'transform .1s' }}
                onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.3)')}
                onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{e}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MessageRow({ msg, onReact }: { msg: any; onReact?: (id: string, emoji: string) => void }) {
  const isUser = msg.role === 'user';

  if (!isUser) {
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
            <div style={{ width:22, height:22, borderRadius:5, flexShrink:0, background:'rgba(167,139,250,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#a78bfa', marginTop:2 }}>J</div>
            <div style={{ flex:1, maxWidth:'calc(100% - 30px)' }}>
              <ThinkBlock thinking={thinkText} answer={answerText} />
              {msg.toolsUsed?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
                  {msg.toolsUsed.map((t: string, i: number) => (
                    <span key={i} style={{ fontSize:9, padding:'2px 6px', borderRadius:10, background:'rgba(0,229,255,.06)', color:'#4a7096' }}>{t}</span>
                  ))}
                </div>
              )}
              {msg.processingMs && (
                <div style={{ fontSize:9, color:'#0e2035', marginTop:4 }}>{msg.model} · {msg.processingMs}ms</div>
              )}
              {/* Reactions display */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                  {Object.entries(msg.reactions as Record<string,number>).map(([e,c]) => (
                    <span key={e} style={{ fontSize:11, background:'rgba(0,229,255,.06)', borderRadius:8, padding:'1px 6px', color:'#4a8090' }}>{e} {c > 1 ? c : ''}</span>
                  ))}
                </div>
              )}
              <ReactionBar msgId={msg.id} onReact={onReact} />
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div>
      <MessageBubble msg={msg} />
      {!isUser && (
        <div style={{ paddingLeft:32, marginTop:-4 }}>
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div style={{ display:'flex', gap:4, marginBottom:2, flexWrap:'wrap' }}>
              {Object.entries(msg.reactions as Record<string,number>).map(([e,c]) => (
                <span key={e} style={{ fontSize:11, background:'rgba(0,229,255,.06)', borderRadius:8, padding:'1px 6px', color:'#4a8090' }}>{e} {c > 1 ? c : ''}</span>
              ))}
            </div>
          )}
          <ReactionBar msgId={msg.id} onReact={onReact} />
        </div>
      )}
    </div>
  );
}
