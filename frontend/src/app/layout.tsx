import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export const metadata: Metadata = { title: 'Minda Prima', description: 'Tuition centre management' };
// The CSP nonce is set per request, so pages are rendered on demand.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('mp-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
