"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/navigation";
import { useSessionDraft } from "@/hooks/useSessionDraft";

const initialRegisterFormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type RegisterFieldError = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export default function RegisterPage() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData, clearRegisterDraft] = useSessionDraft("auth:register:draft", initialRegisterFormData);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldError>({});

  const mapRegisterError = (message: string): RegisterFieldError => {
    const normalized = message.toLowerCase();

    if (normalized.includes("username") && (normalized.includes("exist") || normalized.includes("used") || normalized.includes("taken") || normalized.includes("duplicate"))) {
      return { username: t("errors.usernameTaken"), form: t("errors.usernameTaken") };
    }

    if (normalized.includes("email") && (normalized.includes("exist") || normalized.includes("used") || normalized.includes("taken") || normalized.includes("registered") || normalized.includes("duplicate"))) {
      return { email: t("errors.emailTaken"), form: t("errors.emailTaken") };
    }

    return { form: message || t("errors.registerFailed") };
  };

  const clearFieldError = (field: keyof Omit<RegisterFieldError, "form">) => {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      const message = t("errors.passwordMismatch");
      setFieldErrors({ password: message, confirmPassword: message, form: message });
      toast.error(message);
      return;
    }

    if (formData.password.length < 6) {
      const message = t("errors.passwordTooShort");
      setFieldErrors({ password: message, form: message });
      toast.error(message);
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.username, formData.email, formData.password, formData.confirmPassword);
      clearRegisterDraft();
      toast.success(t("success.registerSuccess"));
      router.push("/icons");
    } catch (error) {
      if (error instanceof Error) {
        const nextErrors = mapRegisterError(error.message || t("errors.registerFailed"));
        setFieldErrors(nextErrors);
        toast.error(nextErrors.form || t("errors.registerFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="space-y-3">
        <p className="ui-section-header">Register</p>
        <h1 className="ui-display-title text-4xl leading-none sm:text-5xl">
          {t("register.title")}
        </h1>
        <p className="ui-copy max-w-xl">{t("register.subtitle")}</p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.username")}</span>
          <Input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => {
              setFormData({ ...formData, username: e.target.value });
              clearFieldError("username");
            }}
            placeholder={common("fields.username")}
            required
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.username)}
            className={fieldErrors.username ? "border-destructive/70 focus-visible:border-destructive" : undefined}
          />
          {fieldErrors.username && <p className="text-sm text-destructive">{fieldErrors.username}</p>}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.email")}</span>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              clearFieldError("email");
            }}
            placeholder={common("fields.email")}
            required
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.email)}
            className={fieldErrors.email ? "border-destructive/70 focus-visible:border-destructive" : undefined}
          />
          {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.password")}</span>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              clearFieldError("password");
            }}
            placeholder={common("fields.password")}
            required
            minLength={6}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.password)}
            className={fieldErrors.password ? "border-destructive/70 focus-visible:border-destructive" : undefined}
          />
          {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{common("fields.confirmPassword")}</span>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              clearFieldError("confirmPassword");
            }}
            placeholder={common("fields.confirmPassword")}
            required
            minLength={6}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            className={fieldErrors.confirmPassword ? "border-destructive/70 focus-visible:border-destructive" : undefined}
          />
          {fieldErrors.confirmPassword && <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
        </label>
      </div>

      <div className="space-y-4">
        <Button type="submit" className="w-full rounded-full" size="lg" disabled={isLoading}>
          {isLoading ? t("actions.signingUp") : t("actions.signUp")}
        </Button>

        <p className="text-center text-sm leading-6 text-muted-foreground">
          {t("register.haveAccount")}{" "}
          <Link href="/auth/login" className="font-medium text-foreground hover:underline">
            {t("actions.signIn")}
          </Link>
        </p>
      </div>
    </form>
  );
}
