'use client'
// ChartRenderer — QuickChart + Mermaid + Recharts
import { useEffect, useRef, useState } from 'react'

type ChartData = {
  type: 'quickchart' | 'mermaid' | 'table' | 'image'
  config?: any    // QuickChart config
  code?: string   // Mermaid code
  headers?: string[]   // Table headers
  rows?: string[][]    // Table rows
  url?: string    // Image URL
  title?: string
}

// Parse JARVIS reply for chart data
export function parseChartData(text: string): ChartData | null {
  // QuickChart JSON block
  const qcMatch = text.match(/```quickchart\n([\s\S]+?)\n```/)
  if (qcMatch) {
    try { return { type: 'quickchart', config: JSON.parse(qcMatch[1]) } } catch {}
  }

  // Mermaid block
  const mermaidMatch = text.match(/```mermaid\n([\s\S]+?)\n```/)
  if (mermaidMatch) return { type: 'mermaid', code: mermaidMatch[1] }

  // Image URL from Pollinations
  const imgMatch = text.match(/https:\/\/image\.pollinations\.ai\/[^\s)]+/)
  if (imgMatch) return { type: 'image', url: imgMatch[0] }

  return null
}

// QuickChart — zero API, just URL
function QuickChartView({ config, title }: { config: any; title?: string }) {
  const encoded = encodeURIComponent(JSON.stringify(config))
  const url = `https://quickchart.io/chart?c=${encoded}&backgroundColor=rgb(10,22,40)&width=600&height=300`
  return (
    <div style={{ marginTop: 10 }}>
      {title && <div style={{ fontSize: 12, color: '#4a7096', marginBottom: 6 }}>{title}</div>}
      <img src={url} alt="Chart" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,229,255,.1)' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#4a7096', display: 'block', marginTop: 4 }}>
        📊 Chart kholo
      </a>
    </div>
  )
}

// Mermaid renderer
function MermaidView({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState('')
  const [err, setErr] = useState(false)

  useEffect(() => {
    // Use Mermaid CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
    script.onload = () => {
      const mermaid = (window as any).mermaid
      mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { primaryColor: '#00e5ff', background: '#0a1628' } })
      mermaid.render('mermaid-' + Date.now(), code).then((r: any) => setSvg(r.svg)).catch(() => setErr(true))
    }
    script.onerror = () => setErr(true)
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [code])

  if (err) return (
    <div style={{ background: 'rgba(0,229,255,.05)', border: '1px solid rgba(0,229,255,.1)', borderRadius: 10, padding: 12, marginTop: 10 }}>
      <div style={{ fontSize: 10, color: '#4a7096', marginBottom: 6 }}>DIAGRAM</div>
      <pre style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'pre-wrap', margin: 0 }}>{code}</pre>
    </div>
  )

  if (svg) return (
    <div style={{ marginTop: 10, background: '#0a1628', borderRadius: 10, padding: 12, border: '1px solid rgba(0,229,255,.1)' }}
      dangerouslySetInnerHTML={{ __html: svg }} />
  )

  return <div style={{ marginTop: 10, color: '#4a7096', fontSize: 12 }}>Loading diagram...</div>
}

// Table renderer
function TableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '8px 12px', background: '#1e3a5f', color: '#00e5ff', textAlign: 'left', border: '1px solid rgba(0,229,255,.1)', fontFamily: 'Arial' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '7px 12px', color: '#e8f4ff', border: '1px solid rgba(255,255,255,.05)', background: ri % 2 === 0 ? '#0a1628' : '#0d1e3a', fontFamily: 'Arial' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ChartRenderer({ data }: { data: ChartData }) {
  if (data.type === 'quickchart') return <QuickChartView config={data.config} title={data.title} />
  if (data.type === 'mermaid') return <MermaidView code={data.code!} />
  if (data.type === 'table') return <TableView headers={data.headers!} rows={data.rows!} />
  if (data.type === 'image') return (
    <div style={{ marginTop: 10 }}>
      <img src={data.url} alt="Generated" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,229,255,.1)' }} />
      <a href={data.url} download target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#00e676', display: 'block', marginTop: 6 }}>
        ⬇ Download
      </a>
    </div>
  )
  return null
}
