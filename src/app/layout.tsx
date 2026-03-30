import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TopNav } from '@/components/TopNav';
import { getThemeScript } from '@/lib/theme/theme-script';
import './globals.css';

/**
 * Root Layout
 *
 * Requirements:
 * - 12.1: Default to dark mode when no user preference is stored
 * - 12.2: Execute pre-paint script in HTML head to set theme class before CSS loads
 * - 12.3: Provide a ThemeToggle component accessible from the top navigation
 */

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Knowledgebase',
    template: '%s | Knowledgebase',
  },
  description: 'Personal knowledgebase for technical how-tos and concepts',
  keywords: ['knowledgebase', 'documentation', 'technical writing', 'how-to'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Suppress hydration warning since theme class is set by pre-paint script
      suppressHydrationWarning
    >
      <head>
        {/* 
          Pre-paint theme script (Requirement 12.2)
          This script runs synchronously before CSS loads to prevent flash of wrong theme.
          It reads the stored preference from localStorage and applies the theme class
          to the html element before any rendering occurs.
        */}
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
        <ThemeProvider>
          <TopNav />
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
