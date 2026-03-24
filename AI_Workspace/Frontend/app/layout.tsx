import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "zCorvus Frontend",
  description: "Frontend bootstrap for the zCorvus multi-agent workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
