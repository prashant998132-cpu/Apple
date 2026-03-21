import type { Metadata } from 'next'
import './globals.css'
import GirlModeBtn from '../components/GirlModeBtn'

export const metadata: Metadata = {
  title: 'JARVIS AI',
  description: 'Personal AI — Voice, Phone Control, Smart Tools',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#040e1a" />
      </head>
      <body style={{margin:0,padding:0,background:'#040e1a'}}>
        {children}
        <GirlModeBtn />
      </body>
    </html>
  )
}
