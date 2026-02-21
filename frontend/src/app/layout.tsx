import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATLAS - Accelerating Talent for Leadership & Success",
  description: "THRiVE Hub LaunchPad Fellowship gamified learning platform empowering African youth for global opportunities.",
  // Enables "Add to Home Screen" / standalone behaviour on iOS Safari
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ATLAS",
  },
  // app/icon.tsx       → <link rel="icon">           (auto-injected by Next.js)
  // app/apple-icon.tsx → <link rel="apple-touch-icon"> (auto-injected by Next.js)
  // public/favicon.ico is served at /favicon.ico for legacy browser requests
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
