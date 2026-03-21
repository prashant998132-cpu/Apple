'use client'
import { useRouter } from 'next/navigation'

export default function GenderToggle() {
  return (
    <div style={{position:'fixed',bottom:'90px',right:'16px',zIndex:9999,display:'flex',flexDirection:'column',gap:'8px'}}>
      <a href="/luna" style={{
        display:'flex',alignItems:'center',gap:'6px',
        background:'linear-gradient(135deg,#ec4899,#8b5cf6)',
        color:'white',border:'none',borderRadius:'20px',
        padding:'8px 14px',fontSize:'12px',fontWeight:'600',
        textDecoration:'none',boxShadow:'0 4px 15px rgba(236,72,153,0.4)',
        whiteSpace:'nowrap'
      }}>
        🌸 Girl Mode
      </a>
    </div>
  )
}
