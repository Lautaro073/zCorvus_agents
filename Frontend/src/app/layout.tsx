import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ReactQueryProvider } from "@/lib/query/provider";
import { getServerPreferences } from "@/lib/server/preferences";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/routing";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZCorvus",
  description: "Icon library, premium access, and admin tools for ZCorvus.",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

function resolveHtmlLocale(rawLocale?: string): Locale {
  return LOCALES.includes(rawLocale as Locale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const prefs = await getServerPreferences();
  const cookieStore = await cookies();
  const locale = resolveHtmlLocale(cookieStore.get("NEXT_LOCALE")?.value);

  return (
    <html
      lang={locale}
      className={prefs.theme}
      data-theme={prefs.theme}
      style={{ colorScheme: prefs.theme }}
    >
      <body
        className={`${geist.variable} ${geistMono.variable} min-h-[100dvh] font-sans`}
        style={{ "--font-kadwa": '"Kadwa", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif' } as React.CSSProperties}
      >
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
