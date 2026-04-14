import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "@/i18n/server";
import localFont from "next/font/local";
import { ViewTransition } from "react";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { AppearanceSync } from "@/components/controllers/AppearanceSync";
import "../globals.css";
import { UIStoreProvider } from "@/store/ui/ui.provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReactQueryProvider } from "@/lib/query/provider";
import { getServerPreferences } from "@/lib/server/preferences";
import type { Theme } from "@/types/icons/icons.types";

export const metadata: Metadata = {
  title: "ZCorvus",
  description: "Icon library, premium access, and admin tools for ZCorvus.",
};

const geist = localFont({
  src: "../../../node_modules/next/dist/esm/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist",
  display: "swap",
});

const geistMono = localFont({
  src: "../../../node_modules/next/dist/esm/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

function getThemeBootstrapScript(theme: Theme) {
  const resolvedTheme = JSON.stringify(theme);

  return `
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(${resolvedTheme});
    document.documentElement.dataset.theme = ${resolvedTheme};
    document.documentElement.style.colorScheme = ${resolvedTheme};
  `;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();
  const globalMessages = {
    common: (messages as { common: unknown }).common,
    auth: (messages as { auth: unknown }).auth,
    admin: (messages as { admin: unknown }).admin,
  };

  const prefs = await getServerPreferences();

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
        <div className="relative mx-auto h-[100dvh] w-full max-w-[1680px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          <Script id="theme-bootstrap" strategy="beforeInteractive">
            {getThemeBootstrapScript(prefs.theme)}
          </Script>
          {process.env.NODE_ENV === "development" && (
            <Script
              src="//unpkg.com/react-scan/dist/auto.global.js"
              strategy="beforeInteractive"
            />
          )}
          <NextIntlClientProvider locale={locale} messages={globalMessages}>
            <AuthProvider>
              <ReactQueryProvider>
                <ViewTransition>
                  <UIStoreProvider initialState={prefs}>
                    {children}
                    <Toaster />
                    <AppearanceSync />
                  </UIStoreProvider>
                </ViewTransition>
              </ReactQueryProvider>
            </AuthProvider>
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}
