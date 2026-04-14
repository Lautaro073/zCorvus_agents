import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "@/i18n/server";
import { ViewTransition } from "react";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { AppearanceSync } from "@/components/controllers/AppearanceSync";
import { UIStoreProvider } from "@/store/ui/ui.provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { getServerPreferences } from "@/lib/server/preferences";
import type { Theme } from "@/types/icons/icons.types";

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
    <div className="relative mx-auto h-[100dvh] w-full max-w-[1680px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <Script id="theme-bootstrap" strategy="beforeInteractive">
        {getThemeBootstrapScript(prefs.theme)}
      </Script>
      <Script id="locale-bootstrap" strategy="beforeInteractive">
        {`document.documentElement.lang = ${JSON.stringify(locale)};`}
      </Script>
      {process.env.NODE_ENV === "development" && (
        <Script
          src="//unpkg.com/react-scan/dist/auto.global.js"
          strategy="beforeInteractive"
        />
      )}
      <NextIntlClientProvider locale={locale} messages={globalMessages}>
        <AuthProvider>
          <ViewTransition>
            <UIStoreProvider initialState={prefs}>
              {children}
              <Toaster />
              <AppearanceSync />
            </UIStoreProvider>
          </ViewTransition>
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  );
}
