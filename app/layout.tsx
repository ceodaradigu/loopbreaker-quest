import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Loopbreaker — Turn loops into songs",
  description:
    "A live composition coach for Audiotool that turns stalled loops into focused musical missions.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Loopbreaker — Turn loops into songs",
    description: "Read the loop. Find the stall. Make one musical move.",
    images: [{ url: "/loopbreaker-og.png", width: 1674, height: 942 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loopbreaker — Turn loops into songs",
    description: "A live composition coach built on Audiotool Nexus.",
    images: ["/loopbreaker-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
