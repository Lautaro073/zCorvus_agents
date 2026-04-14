"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ZIcon } from "@zcorvus/z-icons/react"
import { useRouter } from "@/i18n/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getUserToken, type TokenIcons } from "@/lib/api/backend"

const UserProfileCard = () => {
  const { user, isLoading, logout } = useAuth()
  const auth = useTranslations("auth")
  const common = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const [tokenData, setTokenData] = useState<TokenIcons | null>(null)

  const userRole = user?.role_name || "user"

  useEffect(() => {
    let mounted = true

    if (userRole === "pro") {
      getUserToken()
        .then((result) => {
          if (mounted) {
            setTokenData(result)
          }
        })
        .catch(() => undefined)
    }

    return () => {
      mounted = false
    }
  }, [userRole])

  const emailInitial = user?.email?.charAt(0)?.toUpperCase() || "?"

  const handleSignOut = async () => {
    await logout()
    router.push("/auth/login")
  }

  if (!isLoading && !user) {
    return (
      <Button
        variant="outline"
        aria-label="Sign in"
        className="min-w-0 max-w-full rounded-full px-4"
        onClick={() => router.push("/auth/login")}
      >
        <p className="truncate">{auth("actions.signIn")}</p>
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="User profile"
          className={cn(
            "min-w-0 max-w-full rounded-full px-3.5 sm:px-4",
            user && "uppercase"
          )}
        >
          {isLoading && <div className="h-2 w-20 rounded-full bg-muted-foreground/20 animate-pulse" />}

          {!isLoading && user && (
            <>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">
                {emailInitial}
              </span>
              <p className="max-w-[min(44vw,14rem)] truncate text-xs sm:max-w-[12rem] sm:text-sm">
                {user.username}
              </p>
              <div className="size-2 rounded-full bg-emerald-500" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(28rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-[1.65rem] p-5 sm:p-6"
        side="bottom"
        align="end"
        sideOffset={12}
        alignOffset={0}
      >
        <div className="grid gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-[1.4rem] bg-accent text-xl font-semibold text-foreground shadow-[var(--shadow-soft)]">
                {emailInitial}
              </div>
              <div className="space-y-1">
                <p className="ui-section-header">{common("profile.name")}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="leading-tight text-foreground">{user?.username}</p>
                  {userRole === "pro" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                      PRO
                    </span>
                  )}
                  {user?.two_factor_enabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                      2FA
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userRole === "admin" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="border border-border/60 bg-card/24 text-muted-foreground transition-[transform,background-color,border-color,color] duration-[160ms] ease-[var(--ease-out)] hover:border-border hover:bg-card/60 hover:text-foreground active:scale-[0.985]"
                      >
                        <Link href="/admin" aria-label={common("actions.openAdmin")}>
                          <ZIcon type="mina" name="user-settings" className="size-4 text-current" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{common("actions.openAdmin")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSignOut}
                aria-label={common("actions.signOut")}
                title={common("actions.signOut")}
              >
                <ZIcon type="mina" name="logout" className="size-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="ui-divider" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="ui-section-header">{common("profile.email")}</p>
              <p className="break-all text-sm leading-6 text-foreground">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="ui-section-header">{common("profile.language")}</p>
              <p className="text-sm leading-6 text-foreground capitalize">{locale === "es" ? "Español" : "English"}</p>
            </div>
            <div className="space-y-1">
              <p className="ui-section-header">{common("profile.role")}</p>
              <p className="text-sm leading-6 text-foreground capitalize">{common(`profile.roles.${userRole}`)}</p>
            </div>
            {userRole === "pro" && tokenData?.finish_date && (
              <div className="space-y-1">
                <p className="ui-section-header">{common("profile.tokenExpires")}</p>
                <p className="text-sm leading-6 text-foreground">
                  {new Intl.DateTimeFormat(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(tokenData.finish_date))}
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { UserProfileCard }
