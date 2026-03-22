import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';

import { ThemeProvider } from '@/lib/ui/components/shared/theme-provider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Photo Dedup',
  description: 'Find and clean up duplicate photos and videos',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          enableColorScheme
          enableSystem
          disableTransitionOnChange
          storageKey={'photo-dedup.theme'}
          attribute={'class'}
        >
          <Suspense>{children}</Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
