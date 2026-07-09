import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MANIFEST_URL } from "@/lib/build-version";

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
  title: "Aletheia",
  applicationName: "Aletheia",
  manifest: MANIFEST_URL,
  openGraph: {
    title: "Aletheia",
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
    statusBarStyle: "black-translucent",
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
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ backgroundColor: "#eef2ef" }}
    >
      <head>
        <script
          id="aletheia-startup-error-hook"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (window.__aletheiaStartupErrorHookInstalled) {
                  return;
                }
                window.__aletheiaStartupErrorHookInstalled = true;

                var summarize = function (value) {
                  if (!value) return null;
                  if (typeof value === "string") return value;
                  if (value instanceof Error) return value.stack || value.message || String(value);
                  if (typeof value === "object") {
                    try {
                      return JSON.stringify(value);
                    } catch (error) {
                      return String(value);
                    }
                  }
                  return String(value);
                };

                console.error("[startup:native-head-hook] installed");

                window.addEventListener("error", function (event) {
                  try {
                    console.error("[startup:native-head-error]", {
                      message: event.message,
                      filename: event.filename,
                      lineno: event.lineno,
                      colno: event.colno,
                      error: summarize(event.error),
                    });
                  } catch (error) {
                    console.error("[startup:native-head-error:logging-failed]", summarize(error));
                  }
                });

                window.addEventListener("unhandledrejection", function (event) {
                  try {
                    console.error("[startup:native-head-unhandledrejection]", {
                      reason: summarize(event.reason),
                    });
                  } catch (error) {
                    console.error("[startup:native-head-unhandledrejection:logging-failed]", summarize(error));
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
