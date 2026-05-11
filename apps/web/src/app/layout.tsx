import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/shared/Providers';

export const metadata: Metadata = {
  title: 'MediSaathi — Your Personal Medicine Companion',
  description: 'AI-powered medication tracking, prescription scanning, and adherence monitoring for better health outcomes.',
  keywords: 'medication tracker, prescription scanner, pill reminder, medicine adherence, health app India',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
