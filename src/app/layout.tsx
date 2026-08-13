import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrimedCast - Excel Import & ETL Pipeline",
  description: "Excel Import & ETL Pipeline for Bangladesh Motorcycle Parts Seasonal Demand Forecasting. Upload, map, validate, harmonize, and insert data with quality scoring.",
  keywords: ["TrimedCast", "ETL", "Excel Import", "Bangladesh", "Motorcycle Parts", "Forecasting", "Data Pipeline"],
  authors: [{ name: "TrimedCast Team" }],
  openGraph: {
    title: "TrimedCast - Excel Import & ETL Pipeline",
    description: "Excel Import & ETL Pipeline for BD Motorcycle Parts Forecasting",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrimedCast - Excel Import & ETL Pipeline",
    description: "Excel Import & ETL Pipeline for BD Motorcycle Parts Forecasting",
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
        <Toaster />
      </body>
    </html>
  );
}
