import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Metadata } from 'next';

import { getBaseUrl } from '@/lib/urls';

export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return new URL(getBaseUrl());
    } catch (e) {
      console.error('[layout] Failed to construct metadataBase from:', getBaseUrl());
      return new URL('http://localhost:3000');
    }
  })(),
  alternates: {
    canonical: '/',
  },
  title: {
    template: '%s | Tectome - Modern Task Management',
    default: 'Tectome | Modern Task Management for Growing Teams',
  },
  description: 'Tectome helps modern engineering teams organize, track, and ship high-quality products faster with a unified, real-time workspace inspired by Linear.',
  keywords: ['task management', 'issue tracker', 'project management', 'saas', 'engineering workflow', 'linear task manager'],
  authors: [{ name: 'Tectome' }],
  creator: 'Tectome',
  publisher: 'Tectome',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Tectome',
    title: 'Tectome - Modern Task Management for High-Performing Teams',
    description: 'Transform your team’s productivity with Tectome’s intuitive issue tracking and project management tools. Built for speed and collaboration.',
    images: [
      {
        url: '/og-image.png', // Fallback to an OG image if one exists
        width: 1200,
        height: 630,
        alt: 'Tectome Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tectome - Modern Task Management',
    description: 'Organize chores and ship faster with Tectome.',
    creator: '@tectome',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          #pre-hydrate-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: #5e6ad2;
            z-index: 10000;
            box-shadow: 0 0 12px rgba(94, 106, 210, 0.4);
            animation: pre-hydrate-grow 2s ease-out forwards;
          }
          @keyframes pre-hydrate-grow {
            from { width: 0%; }
            to { width: 25%; }
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col">
        <div id="pre-hydrate-loader" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('load', function() {
            var loader = document.getElementById('pre-hydrate-loader');
            if (loader) loader.style.display = 'none';
          });
        `}} />
        {children}
      </body>
    </html>
  );
}
