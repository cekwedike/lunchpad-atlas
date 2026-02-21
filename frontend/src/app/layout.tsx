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

const APP_URL = "https://launchpadatlas.vercel.app";

export const metadata: Metadata = {
  title: "ATLAS - Accelerating Talent for Leadership & Success",
  description:
    "ATLAS is a gamified learning management system built for the THRiVE Hub LaunchPad Fellowship, empowering African youth for global opportunities. Developed by Chidiebere Ekwedike.",
  applicationName: "ATLAS",
  authors: [{ name: "Chidiebere Ekwedike" }],
  creator: "Chidiebere Ekwedike",
  publisher: "THRiVE Hub LaunchPad Fellowship",
  keywords: [
    "ATLAS",
    "LaunchPad Fellowship",
    "THRiVE Hub",
    "gamified LMS",
    "African youth",
    "learning management system",
    "Chidiebere Ekwedike",
  ],
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "ATLAS — LaunchPad Fellowship",
    title: "ATLAS - Accelerating Talent for Leadership & Success",
    description:
      "A gamified LMS built for the THRiVE Hub LaunchPad Fellowship by Chidiebere Ekwedike — empowering African youth for global opportunities through achievements, live quizzes, and real-time collaboration.",
    images: [
      {
        url: `${APP_URL}/icons/icon-512x512.png`,
        width: 512,
        height: 512,
        alt: "ATLAS platform icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ATLAS - Accelerating Talent for Leadership & Success",
    description:
      "Gamified LMS for THRiVE Hub LaunchPad Fellowship. Developed by Chidiebere Ekwedike.",
    images: [`${APP_URL}/icons/icon-512x512.png`],
  },
  // Enables "Add to Home Screen" / standalone behaviour on iOS Safari
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ATLAS",
  },
  // app/icon.tsx       → <link rel="icon">             (auto-injected by Next.js)
  // app/apple-icon.tsx → <link rel="apple-touch-icon"> (auto-injected by Next.js)
  // public/favicon.ico is served at /favicon.ico for legacy browser requests
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

/** Schema.org JSON-LD — tells Google exactly what ATLAS is and who built it. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ATLAS",
  alternateName: "ATLAS — Accelerating Talent for Leadership & Success",
  url: APP_URL,
  description:
    "ATLAS is a gamified learning management system (LMS) developed by Chidiebere Ekwedike for the THRiVE Hub LaunchPad Fellowship. It empowers African youth through achievements, live quizzes, real-time collaboration, and AI-powered session analytics.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  creator: {
    "@type": "Person",
    name: "Chidiebere Ekwedike",
    jobTitle: "Software Developer",
  },
  author: {
    "@type": "Person",
    name: "Chidiebere Ekwedike",
  },
  publisher: {
    "@type": "Organization",
    name: "THRiVE Hub LaunchPad Fellowship",
    url: APP_URL,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  keywords:
    "gamified LMS, African youth, LaunchPad Fellowship, THRiVE Hub, achievements, live quiz, learning management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
