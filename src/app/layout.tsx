import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
  title: "TrimedCast — Seasonal Demand & Inventory Forecasting",
  description: "Integrated Seasonal Demand & Inventory Forecasting System for Bangladesh Motorcycle Parts Businesses. Stop guessing. Start forecasting.",
  keywords: ["TrimedCast", "Bangladesh", "Motorcycle Parts", "Forecasting", "Seasonal Demand", "Inventory", "S&OP", "EOQ", "Safety Stock", "CNY Risk"],
  authors: [{ name: "TrimedCast Team" }],
  openGraph: {
    title: "TrimedCast — Seasonal Demand & Inventory Forecasting",
    description: "Stop guessing seasonal demand. TrimedCast forecasts when and how much to order for BD motorcycle parts dealers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrimedCast — Seasonal Demand & Inventory Forecasting",
    description: "Stop guessing seasonal demand. TrimedCast forecasts when and how much to order for BD motorcycle parts dealers.",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
