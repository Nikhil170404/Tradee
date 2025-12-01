import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProTrader AI - Free Quantitative Trading Platform",
  description: "Advanced quantitative trading platform with AI-powered stock recommendations, technical analysis, and real-time market data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "antialiased")}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
