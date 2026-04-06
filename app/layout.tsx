import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/shared/BottomNav';

export const metadata: Metadata = {
  title: { default: 'JARVIS AI', template: '%s | JARVIS' },
  description: 'JARVIS Life OS — Personal AI Assistant. Voice, Chat, Tools, Calculator, Mood, Habits & more.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'JARVIS' },
  keywords: ['AI', 'Assistant', 'JARVIS', 'Hinglish', 'Personal AI', 'Life OS'],
  openGraph: {
    title: 'JARVIS Life OS',
    description: 'Personal AI Life OS — Hindi + English',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#040e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{
        margin: 0, padding: 0,
        background: '#040e1a',
        // BottomNav is hidden on /, /luna, /era etc — so no padding needed for those
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
