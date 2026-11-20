import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FinPulse AI — Financial News & Market Intelligence Platform',
  description: 'AI-Powered Financial News & Market Intelligence Assistant for Indian Stock Market (NSE)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070A12] text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
