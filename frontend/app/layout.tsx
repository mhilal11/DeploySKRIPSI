import type { Metadata } from 'next';
import '@/shared/styles/app.css';

export const metadata: Metadata = {
  title: 'HRIS LDP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

