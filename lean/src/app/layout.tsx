import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrimedCast Lean — Session-wise Demand & Order Planning",
  description: "Lean seasonal demand forecasting & inventory planning for Bangladesh motorcycle-parts importers. Excel upload, Eid/Puja/Summer/Winter forecasting, order timing, air vs sea freight, and landed-cost analysis.",
  keywords: ["TrimedCast", "demand forecasting", "Bangladesh", "motorcycle parts", "inventory", "EOQ", "seasonal"],
  authors: [{ name: "TrimedCast" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster />
      </body>
    </html>
  );
}
