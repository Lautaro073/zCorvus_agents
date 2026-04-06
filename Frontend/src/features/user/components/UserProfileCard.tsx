"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ZIcon } from "@zcorvus/z-icons/react";
import { useTranslations } from "next-intl";
import { useLocale } from 'next-intl';
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getUserToken, type TokenIcons } from "@/lib/api/backend";

const UserProfileCard = () => {
  const { user, isLoading, logout } = useAuth();
  const auth = useTranslations('auth');
  const common = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [tokenData, setTokenData] = useState<TokenIcons | null>(null);

  const userRole = user?.role_name || 'user';

  // Obtener datos del token para usuarios premium
  useEffect(() => {
    if (userRole === 'pro') {
      getUserToken().then(setTokenData);
    }
  }, [userRole]);

  const emailInitial = user?.email?.charAt(0)?.toUpperCase() || '?';

  const handleSignOut = async () => {
    await logout();
    router.push('/auth/login');
  }

  // Si no hay sesión, mostrar solo el botón de login sin popover
  if (!isLoading && !user) {
    return (
      <Button
        variant={"outline"}
        aria-label="Sign in"
        className="max-w-full min-w-0 justify-start gap-3 sm:justify-center"
        onClick={() => router.push('/auth/login')}
      >
        <p className="truncate">{auth("actions.signIn")}</p>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          aria-label="User profile"
          className={cn(
            "max-w-full min-w-0 justify-start gap-3 sm:justify-center",
            user && "uppercase"
          )}
        >

          {isLoading && <div className="w-20 h-2 rounded-full bg-muted-foreground/20 animate-pulse" />}

          {!isLoading && user && <>
            <p className="max-w-[min(52vw,14rem)] truncate sm:max-w-[12rem]">{user.username}</p>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </>}

        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[min(500px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-6 py-6 sm:gap-8 sm:py-8"
        side="bottom"
        align="end"
        sideOffset={12}
        alignOffset={0}
      >
        <div className="grid gap-6 sm:grid-cols-[90px_1fr] sm:gap-8">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-border sm:h-24 sm:w-24">
            <span className="text-3xl font-bold text-muted-foreground select-none">{emailInitial}</span>
          </div>
          <section className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h2 className="text-muted-foreground uppercase text-xs">{common('profile.name')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 break-words leading-tight">{user?.username}</p>
                {userRole === 'pro' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    PRO
                  </span>
                )}
                {user?.two_factor_enabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold">
                    2FA
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-muted-foreground uppercase text-xs">{common('profile.email')}</h2>
              <p className="break-all leading-tight">{user?.email}</p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-muted-foreground uppercase text-xs">{common('profile.language')}</h2>
              <p className="leading-tight capitalize">{locale === 'es' ? 'Español' : 'English'}</p>
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-6 border-t border-muted-foreground/30 pt-6 sm:flex-row sm:items-start sm:justify-between sm:pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <div className="pt-0 sm:pt-8">
              <h2 className="text-muted-foreground uppercase text-xs">{common('profile.role')}</h2>
              <p className="text-foreground capitalize">{common(`profile.roles.${userRole}`)}</p>
            </div>
            {userRole === 'pro' && tokenData?.finish_date && (
              <>
                <div className="h-px w-full bg-muted-foreground/30 sm:h-[94px] sm:w-px" />
                <div className="pt-0 sm:pt-8">
                  <h2 className="text-muted-foreground uppercase text-xs">{common('profile.tokenExpires')}</h2>
                  <p>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(tokenData.finish_date))}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center sm:pt-8">
            <Button variant={"ghost"} size="icon" onClick={handleSignOut}>
              <ZIcon type="mina" name="logout" className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { UserProfileCard } 
