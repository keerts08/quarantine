import type { Metadata } from "next";
import { Oswald, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"]
})

const body = IBM_Plex_Mono({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"]
})

export const metadata: Metadata = {
  title: "Quarantine",
  description: "Something wants to enter. Board your doors, hold the line and survive the night.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", display.variable, body.variable)}
    >
      <body className="min-h-full bg-void text-ink font-[family-name:var(--font-body)]">{children}</body>
    </html>
  );
}
