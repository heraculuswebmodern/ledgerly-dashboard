import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers/providers";

import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ledgerly-dashboard.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ledgerly", template: "%s · Ledgerly" },
  description:
    "Business banking, simplified. Accounts, payments, cards and cash-flow insight for growing companies.",
  applicationName: "Ledgerly",
  openGraph: {
    type: "website",
    siteName: "Ledgerly",
    title: "Ledgerly",
    description: "Business banking, simplified.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledgerly",
    description: "Business banking, simplified.",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
