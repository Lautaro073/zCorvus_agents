"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";
import { getUserToken } from "@/lib/api/backend";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_TOKEN_ATTEMPTS = 3;

export default function SuccessPage() {
    const t = useTranslations("premium");
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, refreshSession } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [npmToken, setNpmToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    useEffect(() => {
        async function fetchToken() {
            if (authLoading || hasCheckedAuth) {
                return;
            }

            setHasCheckedAuth(true);

            try {
                if (!isAuthenticated || !user) {
                    router.push("/auth/login");
                    return;
                }

                await refreshSession();

                let attempts = 0;
                while (attempts < MAX_TOKEN_ATTEMPTS) {
                    attempts += 1;
                    setRetryCount(attempts);

                    try {
                        const tokenData = await getUserToken();
                        if (tokenData && typeof tokenData.token === "string" && tokenData.token.length > 0) {
                            setNpmToken(tokenData.token);
                            localStorage.setItem("zcorvus_npm_token", tokenData.token);
                            setLoading(false);
                            toast.success(t("success.tokenGenerated"));
                            return;
                        }
                    } catch {}

                    if (attempts < MAX_TOKEN_ATTEMPTS) {
                        await new Promise((resolve) => setTimeout(resolve, 1500));
                    }
                }

                toast.error(t("success.tokenNotFound"));
                setLoading(false);
            } catch {
                toast.error(t("errors.unknown"));
                setLoading(false);
            }
        }

        fetchToken();
    }, [router, t, isAuthenticated, user, authLoading, hasCheckedAuth, refreshSession]);

    const copyToken = () => {
        if (!npmToken) {
            return;
        }

        navigator.clipboard.writeText(npmToken);
        toast.success(t("success.tokenCopied"));
    };

    const downloadNpmrc = () => {
        if (!npmToken) {
            return;
        }

        const content = `# zCorvus Premium Access Token
# Generated on ${new Date().toLocaleDateString()}

@zcorvus:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${npmToken}
`;

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = ".npmrc";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        toast.success(t("success.fileDownloaded"));
    };

    const isProvisioning = authLoading || loading;
    const hasToken = Boolean(npmToken);
    const checkpoints = [
        t("success.checkpoints.auth"),
        t("success.checkpoints.token"),
        t("success.checkpoints.ready"),
    ];

    return (
        <div className="relative isolate px-2 py-4 sm:px-4 sm:py-6 lg:px-6">
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_50%)]"
            />
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/icons")}
                    className="group w-fit rounded-full border border-border/70 bg-background/85"
                    aria-label={t("backToIcons")}
                >
                    <ZIcon
                        type="mina"
                        name="arrow-left"
                        className="size-6 group-hover:text-foreground transition-colors"
                    />
                </Button>

                <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-emerald-500/12 via-background to-background p-6 shadow-sm sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-4">
                            <span className="inline-flex rounded-full bg-emerald-500/12 px-3 py-1 text-xs uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                                {t("success.eyebrow")}
                            </span>
                            <div className="inline-flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-300">
                                <ZIcon type="mina" name="check" className="size-10" />
                            </div>
                            <div className="space-y-3">
                                <h1 className="font-kadwa leading-[0.95] text-4xl sm:text-5xl">
                                    {t("success.title")}
                                </h1>
                                <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                                    {t("success.subtitle")}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-border/60 bg-background/75 p-5 lg:min-w-[280px]">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                {t("success.statusLabel")}
                            </p>
                            <p
                                className={cn(
                                    "mt-3 text-lg",
                                    isProvisioning
                                        ? "text-amber-700 dark:text-amber-300"
                                        : hasToken
                                            ? "text-emerald-700 dark:text-emerald-300"
                                            : "text-amber-700 dark:text-amber-300"
                                )}
                            >
                                {isProvisioning
                                    ? t("success.statusProcessing")
                                    : hasToken
                                        ? t("success.statusReady")
                                        : t("success.statusAttention")}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {hasToken ? t("success.fullAccessMessage") : t("success.generatingMessage")}
                            </p>
                            {sessionId ? (
                                <div className="mt-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                        {t("success.sessionLabel")}:
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground/80 break-all font-mono" title={sessionId}>
                                        {sessionId}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>

                {isProvisioning ? (
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                        <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center gap-2" aria-hidden>
                                    <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                                <p className="text-lg text-foreground">{t("success.generatingToken")}</p>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {t("success.retryAttempt", { count: retryCount, total: MAX_TOKEN_ATTEMPTS })}
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                {checkpoints.map((item, index) => (
                                    <div
                                        key={item}
                                        className="rounded-[1.5rem] border border-border/60 bg-background/75 p-4"
                                    >
                                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                            {String(index + 1).padStart(2, "0")}
                                        </p>
                                        <p className="mt-3 text-sm leading-6 text-foreground/88">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
                            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                                {t("success.setupCardTitle")}
                            </p>
                            <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                {t("success.generatingMessage")}
                            </p>
                        </aside>
                    </section>
                ) : hasToken ? (
                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                        <div className="rounded-[2rem] border border-emerald-500/25 bg-card/95 p-6 shadow-sm sm:p-8">
                            <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                                        {t("success.statusReady")}
                                    </p>
                                    <h2 className="mt-2 text-2xl text-foreground sm:text-3xl">
                                        {t("success.npmToken")}
                                    </h2>
                                </div>
                                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                                    {t("success.npmInstructions")}
                                </p>
                            </div>

                            <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-muted/60 p-4 sm:p-5">
                                <pre className="overflow-x-auto break-all font-mono text-xs text-foreground sm:text-sm">
                                    {npmToken}
                                </pre>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button onClick={copyToken} variant="default" className="rounded-full">
                                    {t("success.copyToken")}
                                </Button>
                                <Button onClick={downloadNpmrc} variant="outline" className="rounded-full">
                                    {t("success.downloadNpmrc")}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <aside className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
                                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                                    {t("success.setupCardTitle")}
                                </p>
                                <ol className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
                                    <li>
                                        <strong className="text-foreground">{t("success.option1")}</strong>
                                    </li>
                                    <li>
                                        <strong className="text-foreground">{t("success.option2")}</strong>
                                        <pre className="mt-3 overflow-x-auto rounded-[1.25rem] border border-border/60 bg-muted/60 p-4 font-mono text-xs text-foreground">
{`@zcorvus:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${npmToken}`}
                                        </pre>
                                    </li>
                                    <li>
                                        <strong className="text-foreground">{t("success.installPackage")}</strong>
                                        <pre className="mt-3 overflow-x-auto rounded-[1.25rem] border border-border/60 bg-muted/60 p-4 font-mono text-xs text-foreground">
{`npm install @zcorvus/z-icons-premium
pnpm add @zcorvus/z-icons-premium`}
                                        </pre>
                                    </li>
                                </ol>
                            </aside>

                            <aside className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
                                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                                    {t("success.quickAccessTitle")}
                                </p>
                                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                    {t("success.fullAccessMessage")}
                                </p>
                                <Button
                                    onClick={() => router.push("/icons/premium/fa-solid")}
                                    size="lg"
                                    className="mt-6 w-full rounded-full"
                                >
                                    {t("success.viewIconsNow")}
                                </Button>
                            </aside>
                        </div>
                    </section>
                ) : (
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                        <div className="rounded-[2rem] border border-amber-500/25 bg-card/95 p-6 shadow-sm sm:p-8">
                            <div className="inline-flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/25 dark:text-amber-300">
                                <ZIcon type="mina" name="info" className="size-8" />
                            </div>
                            <h2 className="mt-6 text-2xl text-foreground sm:text-3xl">
                                {t("success.statusAttention")}
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                {t("success.generatingMessage")}
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full">
                                    <ZIcon type="mina" name="refresh" className="mr-2 size-4" />
                                    {t("success.retry")}
                                </Button>
                                <Button onClick={() => router.push("/premium")} variant="secondary" className="rounded-full">
                                    {t("success.continue")}
                                </Button>
                            </div>
                        </div>

                        <aside className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
                            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                                {t("success.setupCardTitle")}
                            </p>
                            <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                {t("success.contactSupport")}
                            </p>
                        </aside>
                    </section>
                )}
            </div>
        </div>
    );
}
