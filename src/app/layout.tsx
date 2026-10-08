import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/* Siraj type system — display / body / mono (all self-hosted via next/font) */
const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-display",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Hadith Ai.BOT — لوحة التحكم",
  description:
    "النظام الإداري الشامل لبوت واتساب الإسلامي Hadith Ai.BOT — منظمة حديث الإسلامية، تطوير UNIRAL",
  keywords: [
    "Hadith Ai.BOT",
    "بوت واتساب إسلامي",
    "لوحة تحكم",
    "منظمة حديث الإسلامية",
    "UNIRAL",
    "حديث شريف",
    "قرآن كريم",
    "اقتباسات إسلامية",
  ],
  applicationName: "Hadith Ai.BOT",
  icons: {
    icon: "/logo-siraj.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${amiri.variable} ${plexArabic.variable} ${plexMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
