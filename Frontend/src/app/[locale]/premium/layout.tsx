import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "@/i18n/server";

export default async function PremiumLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const premiumMessages = { premium: (messages as { premium: unknown }).premium };

  return (
    <NextIntlClientProvider messages={premiumMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
