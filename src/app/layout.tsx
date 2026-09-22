import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Newsreader, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const newsreader = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const absans = localFont({
  src: [
    {
      path: '../../public/fonts/Absans-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Absans-Regular.woff',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-absans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://singularity.space.edu.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Singularity People — Singularity Student Lab',
    template: '%s — Singularity Student Lab',
  },
  description: 'Directory and verified member portfolio platform of the Singularity Student Lab, SRM University AP.',
  keywords: [
    'Singularity People',
    'Singularity Student Lab',
    'SRM University AP',
    'Student Portfolios',
    'Software Engineering',
    'Full Stack Development',
    'Member Directory',
  ],
  authors: [{ name: 'Singularity Student Lab', url: siteUrl }],
  creator: 'Singularity Student Lab',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Singularity Student Lab',
    title: 'Singularity People — Singularity Student Lab',
    description: 'Directory and verified member portfolio platform of the Singularity Student Lab, SRM University AP.',
    images: [
      {
        url: '/singularity_logo.webp',
        width: 512,
        height: 512,
        alt: 'Singularity Student Lab Emblem',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Singularity People — Singularity Student Lab',
    description: 'Directory and verified member portfolio platform of the Singularity Student Lab, SRM University AP.',
    images: ['/singularity_logo.webp'],
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
      { url: '/singularity_logo.webp', type: 'image/webp' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-icon.png' }, { url: '/singularity_logo.webp' }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;

  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${absans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-sans" data-nonce={nonce ? 'active' : undefined}>
        {children}
      </body>
    </html>
  );
}
