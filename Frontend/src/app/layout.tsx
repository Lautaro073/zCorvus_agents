import type { Metadata } from "next";
import localFont from "next/font/local";
import { ReactQueryProvider } from "@/lib/query/provider";
import { getServerPreferences } from "@/lib/server/preferences";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZCorvus",
  description: "Icon library, premium access, and admin tools for ZCorvus.",
};

const geist = localFont({
  src: "../../node_modules/next/dist/esm/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist",
  display: "swap",
});

const geistMono = localFont({
  src: "../../node_modules/next/dist/esm/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const prefs = await getServerPreferences();

  return (
    <html
      lang="en"
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
