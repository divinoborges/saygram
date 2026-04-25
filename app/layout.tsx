import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { themeInitScript } from "@/lib/theme-pref";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL ??
  "http://localhost:3000";

const metadataBase = new URL(
  siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
);

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase,
  title: "Saygram",
  description: "Build Mermaid diagrams by voice using the OpenAI Realtime API.",
  icons: {
    icon: [
      { url: asset("/favicon.ico"), sizes: "any" },
      { url: asset("/favicon-16x16.png"), type: "image/png", sizes: "16x16" },
      { url: asset("/favicon-32x32.png"), type: "image/png", sizes: "32x32" },
      { url: asset("/android-chrome-192x192.png"), type: "image/png", sizes: "192x192" },
      { url: asset("/android-chrome-512x512.png"), type: "image/png", sizes: "512x512" },
    ],
    shortcut: asset("/favicon.ico"),
    apple: [
      { url: asset("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: asset("/site.webmanifest"),
  openGraph: {
    title: "Saygram",
    description: "Build Mermaid diagrams by voice using the OpenAI Realtime API.",
    images: [asset("/screenshot.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saygram",
    description: "Build Mermaid diagrams by voice using the OpenAI Realtime API.",
    images: [asset("/screenshot.png")],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${roboto.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
