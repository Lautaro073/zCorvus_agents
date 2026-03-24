import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function PremiumLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const premiumMessages = { premium: (messages as any).premium };

  return (
    <NextIntlClientProvider messages={premiumMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
