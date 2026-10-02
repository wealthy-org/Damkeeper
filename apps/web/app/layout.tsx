import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IconSprite } from "./icon-sprite";

const siteUrl =
  (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("http"))
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://www.damkeeper.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Damkeeper · Token locks and vesting on Robinhood Chain",
    template: "%s · Damkeeper",
  },
  description:
    "Create transparent token locks and vesting schedules on Robinhood Chain. Every position has clear terms and onchain proof.",
  openGraph: {
    title: "Damkeeper · Token locks and vesting on Robinhood Chain",
    description:
      "Create transparent token locks and vesting schedules on Robinhood Chain. Every position has clear terms and onchain proof.",
    url: siteUrl,
    siteName: "Damkeeper",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Damkeeper Protocol",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Damkeeper · Token locks and vesting on Robinhood Chain",
    description:
      "Create transparent token locks and vesting schedules on Robinhood Chain. Every position has clear terms and onchain proof.",
    images: ["/api/og"],
    creator: "@damkeeper_fi",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b110e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
