import { redirect } from "next/navigation";
import { verifyAdminAccess } from "@/lib/server/admin-access";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  const accessStatus = await verifyAdminAccess();

  if (accessStatus === "auth_required") {
    redirect(`/${locale}/auth/login`);
  }

  if (accessStatus === "session_expired") {
    redirect(`/${locale}/auth/login?session=expired`);
  }

  if (accessStatus === "forbidden") {
    redirect(`/${locale}/icons`);
  }

  return <>{children}</>;
}
