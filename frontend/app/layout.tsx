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
        {children}
      </body>
    </html>
  );
}
