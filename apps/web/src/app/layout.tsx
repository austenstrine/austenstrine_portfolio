import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Austen Strine Portfolio',
  description: 'Portfolio app with Next.js frontend and NestJS backend',
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
