import type { Metadata, Viewport } from "next";
import { Antic_Didone, Figtree } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Exclusive benefit | MK Jewels",
  description: "Unlock your exclusive MK Jewels benefit and receive personalised assistance.",
  robots: { index: false, follow: false },
};

const display = Antic_Didone({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const ui = Figtree({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-IN" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
