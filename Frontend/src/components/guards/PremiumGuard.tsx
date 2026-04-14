"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { useAuth } from "@/contexts/AuthContext";

interface PremiumGuardProps {
  children: React.ReactNode;
  requiredForTypes?: string[];
}

export function PremiumGuard({
  children,
  requiredForTypes = ["premium", "fa-solid", "fa-regular"],
}: PremiumGuardProps) {
  const { hasAccess, isLoading } = usePremiumAccess();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPremiumRoute = requiredForTypes.some((type) => pathname.includes(`/icons/${type}`));

    if (!isPremiumRoute || isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!hasAccess) {
      router.replace("/premium");
    }
  }, [hasAccess, isAuthenticated, isLoading, pathname, requiredForTypes, router]);

  if (isLoading) {
    return (
      <div className="grid gap-5">
        <section className="ui-surface-panel-muted relative overflow-hidden rounded-[1.85rem] p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foreground/18 to-transparent" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-4">
              <div className="h-3 w-28 animate-pulse rounded-full bg-muted/70" />
              <div className="h-12 w-full max-w-xl animate-pulse rounded-[1.25rem] bg-muted/70" />
              <div className="h-5 w-full max-w-2xl animate-pulse rounded-full bg-muted/60" />
              <div className="flex flex-wrap gap-3 pt-3">
                <div className="h-11 w-36 animate-pulse rounded-full bg-muted/70" />
                <div className="h-11 w-40 animate-pulse rounded-full bg-muted/55" />
              </div>
            </div>
            <div className="ui-surface-panel grid gap-3 rounded-[1.5rem] p-4">
              <div className="h-32 animate-pulse rounded-[1.2rem] bg-muted/65" />
              <div className="h-14 animate-pulse rounded-[1rem] bg-muted/55" />
              <div className="h-14 animate-pulse rounded-[1rem] bg-muted/55" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="ui-surface-panel h-32 animate-pulse rounded-[1.5rem] bg-card/70" />
          ))}
        </section>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
