import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/providers/wallet-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Navbar } from "@/components/layout/navbar";
import { GradientMeshBg } from "@/components/layout/gradient-mesh-bg";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "FlowWork — Your work is your credit history",
  description:
    "On-chain payroll and reputation for gig workers and cross-border freelancers, built on Solana.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans bg-background text-foreground min-h-screen`}
      >
        <QueryProvider>
          <WalletProvider>
            <div className="grain-overlay" />
            <GradientMeshBg />
            <Navbar />
            <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
              {children}
            </main>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
