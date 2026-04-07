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

type ForgotStep = "request" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { currentLocale } = useLocale();

  const [step, setStep] = useState<ForgotStep>("request");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canVerifyOtp = useMemo(() => otp.trim().length === 6, [otp]);

  const onRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordResetOtp(email.trim(), currentLocale);
      toast.success(auth("success.otpSent"));
      setStep("verify");
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
      setStep("reset");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || auth("errors.otpVerifyFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(auth("errors.passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(auth("errors.passwordMismatch"));
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
      className="rounded-[2rem] border border-border/70 bg-card/90 px-5 py-6 shadow-sm sm:px-7 sm:py-8 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none"
    >
      <div className="flex flex-col gap-6 lg:gap-10">
        <div className="space-y-2">
          <h1 className="font-kadwa text-4xl leading-none sm:text-5xl lg:font-medium lg:text-2xl lg:leading-tight lg:uppercase">
            {auth("forgotPassword.title")}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base lg:text-sm lg:leading-tight">
            {auth("forgotPassword.subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground lg:sr-only">{common("fields.email")}</span>
            <Input
              type="email"
              placeholder={common("fields.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || step !== "request"}
              className="h-11 rounded-xl lg:h-9 lg:rounded-md"
              autoComplete="email"
            />
          </label>

          {step !== "request" && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground lg:sr-only">{auth("forgotPassword.otpLabel")}</span>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={auth("forgotPassword.otpPlaceholder")}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading || step === "reset"}
                className="h-11 rounded-xl lg:h-9 lg:rounded-md"
              />
            </label>
          )}

          {step === "reset" && (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground lg:sr-only">{auth("forgotPassword.newPasswordLabel")}</span>
                <Input
                  type="password"
                  placeholder={auth("forgotPassword.newPasswordLabel")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                  autoComplete="new-password"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground lg:sr-only">{auth("forgotPassword.confirmNewPasswordLabel")}</span>
                <Input
                  type="password"
                  placeholder={auth("forgotPassword.confirmNewPasswordLabel")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-base lg:mt-2 lg:h-9 lg:rounded-md lg:text-sm"
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

          <p className="text-center text-sm leading-6 text-muted-foreground lg:mt-4 lg:text-sm lg:leading-normal">
            <Link href="/auth/login" className="font-medium text-foreground hover:underline">
              {auth("actions.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}
