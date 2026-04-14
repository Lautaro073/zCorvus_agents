"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useRouter } from "@/i18n/navigation";
import { useSessionDraft } from "@/hooks/useSessionDraft";

const initialLoginFormData = {
  email: "",
  password: "",
  twoFactorCode: "",
  requires2FA: false,
};

export default function LoginPage() {
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const handledSessionFeedback = useRef(false);
  const [formData, setFormData, clearLoginDraft] = useSessionDraft("auth:login:draft", initialLoginFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const requires2FA = formData.requires2FA;

  useEffect(() => {
    if (handledSessionFeedback.current) {
      return;
    }

    const session = searchParams.get("session");

    if (session === "expired") {
      handledSessionFeedback.current = true;
      toast.info(auth("errors.sessionExpired"));
      router.replace("/auth/login");
    }
  }, [auth, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(
        formData.email,
        formData.password,
        formData.twoFactorCode || undefined
      );

      clearLoginDraft();
      toast.success(auth("success.loginSuccess"));

      if (loggedUser.role_name === "admin") {
        router.push("/admin");
      } else {
        router.push("/icons");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "2FA_REQUIRED") {
          setFormData((current) => ({ ...current, requires2FA: true }));
          setFormError(null);
          toast.info(auth("actions.enter2FA"));
        } else {
          const normalizedMessage =
            error.message === "Invalid credentials"
              ? auth("errors.invalidCredentials")
              : error.message || auth("errors.loginFailed");

          setFormError(normalizedMessage);
          toast.error(normalizedMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="space-y-3">
        <h1 className="ui-display-title text-4xl leading-none sm:text-5xl">
          {auth("screens.signIn.title")}
        </h1>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.email")}</span>
          <Input
            type="email"
            placeholder={common("fields.email")}
            value={formData.email}
            required
            disabled={isLoading}
            autoComplete="email"
            aria-invalid={Boolean(formError)}
            className={formError ? "border-destructive/70 focus-visible:border-destructive" : undefined}
            onChange={(e) => {
              setFormData((current) => ({ ...current, email: e.target.value }));
              if (formError) setFormError(null);
            }}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.password")}</span>
          <Input
            type="password"
            placeholder={common("fields.password")}
            value={formData.password}
            required
            disabled={isLoading}
            autoComplete="current-password"
            aria-invalid={Boolean(formError)}
            className={formError ? "border-destructive/70 focus-visible:border-destructive" : undefined}
            onChange={(e) => {
              setFormData((current) => ({ ...current, password: e.target.value }));
              if (formError) setFormError(null);
            }}
          />
        </label>

        {formError && (
          <p
            role="alert"
            className="rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {formError}
          </p>
        )}

        {requires2FA && (
          <div className="rounded-[1.4rem] border border-primary/18 bg-primary/8 p-4">
            <p className="ui-section-header !tracking-[0.22em]">{auth("actions.enter2FA")}</p>
            <label className="mt-3 grid gap-2">
              <span className="text-sm font-medium text-foreground">{auth("twoFactor.code")}</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={auth("twoFactor.placeholder")}
                value={formData.twoFactorCode}
                onChange={(e) => setFormData((current) => ({ ...current, twoFactorCode: e.target.value }))}
                maxLength={6}
                disabled={isLoading}
              />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Button type="submit" className="w-full rounded-full" size="lg" disabled={isLoading}>
          {isLoading ? auth("actions.signingIn") : auth("actions.signIn")}
        </Button>

        <p className="text-center text-sm leading-6 text-muted-foreground">
          <Link href="/auth/forgot-password" className="font-medium text-foreground hover:underline">
            {auth("actions.forgotPassword")}
          </Link>
        </p>

        <p className="text-center text-sm leading-6 text-muted-foreground">
          {auth("screens.signIn.noAccount")}{" "}
          <Link href="/auth/signup" className="font-medium text-foreground hover:underline">
            {auth("actions.signUp")}
          </Link>
        </p>
      </div>
    </form>
  );
}
