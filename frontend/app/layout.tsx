import { Suspense } from 'react';

import AppClientRoot from '@/runtime/AppClientRoot';

import type { Metadata } from 'next';
import '@/shared/styles/app.css';

export const metadata: Metadata = {
  title: 'HRIS LDP',
  icons: {
    icon: '/LogoLDP.png',
    shortcut: '/LogoLDP.png',
    apple: '/LogoLDP.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AppClientRoot />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
