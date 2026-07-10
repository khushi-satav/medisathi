import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/shared/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MediSaathi — Your Personal Medicine Companion',
  description: 'AI-powered medication tracking, prescription scanning, and adherence monitoring for better health outcomes.',
  keywords: 'medication tracker, prescription scanner, pill reminder, medicine adherence, health app India',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
