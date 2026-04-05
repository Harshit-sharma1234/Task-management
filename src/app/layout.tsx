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

export const metadata: Metadata = {
  title: {
    template: '%s | Task Management',
    default: 'Task Management - Manage your workspace efficiently',
  },
  description: 'A powerful, fast, and secure task management solution for modern teams.',
  openGraph: {
    title: 'Task Management System',
    description: 'A powerful, fast, and secure task management solution for modern teams.',
    type: 'website',
    siteName: 'Task Management',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Task Management System',
    description: 'A powerful, fast, and secure task management solution for modern teams.',
  }
};

import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Toaster position="top-right" richColors />
        {children}
      </body>
    </html>
  );
}
