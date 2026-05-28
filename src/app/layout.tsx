import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: "Aletheia | Biblical Wisdom for Money and Work",
  description:
    "A calm AI-powered wisdom companion for stewardship, work, generosity, and thoughtful financial decisions.",
  applicationName: "Aletheia",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Aletheia",
    description:
      "AI-powered biblical wisdom for money, work, and stewardship.",
    siteName: "Aletheia",
    type: "website",
    images: [
      {
        url: "/brand/aletheia-app-icon-512.png",
        width: 512,
        height: 512,
        alt: "Aletheia app icon",
      },
    ],
  },
  icons: {
    icon: [
      {
        url: "/brand/aletheia-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/aletheia-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Aletheia",
    statusBarStyle: "black",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1514" },
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
      style={{ backgroundColor: "#0e1514" }}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
