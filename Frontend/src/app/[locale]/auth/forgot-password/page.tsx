"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/useLocale";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "@/lib/api/backend";
import { useSessionDraft } from "@/hooks/useSessionDraft";

type ForgotStep = "request" | "verify" | "reset";

const initialForgotPasswordDraft = {
  step: "request" as ForgotStep,
  email: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ForgotPasswordPage() {
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { currentLocale } = useLocale();

  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft, clearForgotDraft] = useSessionDraft("auth:forgot-password:draft", initialForgotPasswordDraft);
  const [resetError, setResetError] = useState<string | null>(null);
  const step = draft.step;
  const email = draft.email;
  const otp = draft.otp;
  const newPassword = draft.newPassword;
  const confirmPassword = draft.confirmPassword;

  const canVerifyOtp = useMemo(() => otp.trim().length === 6, [otp]);

  const normalizeOtpError = (message: string) => {
    if (message === "Invalid or expired OTP") {
      return auth("errors.invalidOrExpiredOtp");
    }

    return message || auth("errors.otpVerifyFailed");
  };

  const onRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setIsLoading(true);

    try {
      await requestPasswordResetOtp(email.trim(), currentLocale);
      toast.success(auth("success.otpSent"));
      setDraft((current) => ({ ...current, step: "verify" }));
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || auth("errors.passwordResetRequestFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!otp.trim()) {
      toast.error(auth("errors.otpRequired"));
      return;
    }

    if (otp.trim().length !== 6) {
      toast.error(auth("errors.otpLength"));
      return;
    }

    setIsLoading(true);

    try {
      await verifyPasswordResetOtp(email.trim(), otp.trim(), currentLocale);
      toast.success(auth("success.otpVerified"));
      setDraft((current) => ({ ...current, step: "reset" }));
    } catch (error) {
      if (error instanceof Error) {
        toast.error(normalizeOtpError(error.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 6) {
      const message = auth("errors.passwordTooShort");
      setResetError(message);
      toast.error(message);
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = auth("errors.passwordMismatch");
      setResetError(message);
      toast.error(message);
      return;
    }

    setIsLoading(true);

    try {
      await resetPasswordWithOtp(
        email.trim(),
        otp.trim(),
        newPassword,
        confirmPassword,
        currentLocale
      );
      clearForgotDraft();
      toast.success(auth("success.passwordResetSuccess"));
      router.push("/auth/login");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || auth("errors.passwordResetFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={step === "request" ? onRequestOtp : step === "verify" ? onVerifyOtp : onResetPassword}
      className="flex flex-col gap-8"
    >
      <div className="space-y-3">
        <h1 className="ui-display-title text-4xl leading-none sm:text-5xl">
          {auth("forgotPassword.title")}
        </h1>
        <p className="ui-copy max-w-xl">{auth("forgotPassword.subtitle")}</p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.email")}</span>
          <Input
            type="email"
            placeholder={common("fields.email")}
            value={email}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                email: e.target.value,
                step: current.step === "request" ? current.step : "request",
                otp: "",
                newPassword: "",
                confirmPassword: "",
              }))
            }
            required
            disabled={isLoading}
            autoComplete="email"
          />
        </label>

        {step !== "request" && (
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">{auth("forgotPassword.otpLabel")}</span>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={auth("forgotPassword.otpPlaceholder")}
              value={otp}
              onChange={(e) => setDraft((current) => ({ ...current, otp: e.target.value }))}
              required
              disabled={isLoading || step === "reset"}
            />
          </label>
        )}

        {step === "reset" && (
          <>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">{auth("forgotPassword.newPasswordLabel")}</span>
              <Input
                type="password"
                placeholder={auth("forgotPassword.newPasswordLabel")}
                value={newPassword}
                onChange={(e) => {
                  setDraft((current) => ({ ...current, newPassword: e.target.value }));
                  if (resetError) setResetError(null);
                }}
                required
                minLength={6}
                disabled={isLoading}
                autoComplete="new-password"
                aria-invalid={Boolean(resetError)}
                className={resetError ? "border-destructive/70 focus-visible:border-destructive" : undefined}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">{auth("forgotPassword.confirmNewPasswordLabel")}</span>
              <Input
                type="password"
                placeholder={auth("forgotPassword.confirmNewPasswordLabel")}
                value={confirmPassword}
                onChange={(e) => {
                  setDraft((current) => ({ ...current, confirmPassword: e.target.value }));
                  if (resetError) setResetError(null);
                }}
                required
                minLength={6}
                disabled={isLoading}
                autoComplete="new-password"
                aria-invalid={Boolean(resetError)}
                className={resetError ? "border-destructive/70 focus-visible:border-destructive" : undefined}
              />
            </label>

            {resetError && (
              <p
                role="alert"
                className="rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {resetError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-4">
        <Button
          type="submit"
          className="w-full rounded-full"
          size="lg"
          disabled={isLoading || (step === "verify" && !canVerifyOtp)}
        >
          {isLoading
            ? common("actions.loading")
            : step === "request"
              ? auth("actions.sendOtp")
              : step === "verify"
                ? auth("actions.verifyOtp")
                : auth("actions.resetPassword")}
        </Button>

        <p className="text-center text-sm leading-6 text-muted-foreground">
          <Link href="/auth/login" className="font-medium text-foreground hover:underline">
            {auth("actions.backToLogin")}
          </Link>
        </p>
      </div>
    </form>
  );
}
