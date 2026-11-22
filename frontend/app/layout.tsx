import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FinPulse AI — Clarity for complex financial markets.',
  description: 'An Explainable Generative AI Financial Research Assistant Using Retrieval-Augmented Generation and Cloud Computing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
