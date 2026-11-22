import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FinPulse AI — Ask Better Questions. Understand Financial Markets.',
  description: 'An Explainable Generative AI Financial Research Assistant Using Retrieval-Augmented Generation and Cloud Computing',
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
