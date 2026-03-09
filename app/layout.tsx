// ============================================================
// app/layout.tsx — JARVIS v10.7+ BottomNav integrated
// CHANGES: import BottomNav + add inside body + add padding-bottom
// ============================================================

import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/shared/BottomNav';

export const metadata: Metadata = {
  title: 'JARVIS',
  description: 'Your Personal AI Assistant',
  manifest: '/manifest.json',
  themeColor: '#0a0a14',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JARVIS',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* KaTeX CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
        />
        {/* Noto Color Emoji */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        {/* PWA icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon-192.png" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#0a0a14',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Color Emoji", sans-serif',
          /* CRITICAL: bottom padding so content doesn't hide under BottomNav */
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          minHeight: '100dvh',
        }}
      >
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
