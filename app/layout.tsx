// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JARVIS — Personal AI',
  description: 'Autonomous Hindi-first personal AI assistant. Free forever.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'JARVIS' },
  icons: { icon: '/icons/icon-192x192.png', apple: '/icons/icon-192x192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#020917',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&family=Noto+Sans+Devanagari:wght@400;500;600&family=Rajdhani:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#020917', overscrollBehavior: 'none' }}>
        {children}
        <div id="portal" />
      </body>
    </html>
  );
}
