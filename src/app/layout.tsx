import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";

import { AppProviders } from "@/components/providers/session-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Step Up",
  description: "29-day group steps challenge — log steps, earn points, climb the leaderboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
