"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  });
  const [requires2FA, setRequires2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(
        formData.email,
        formData.password,
        formData.twoFactorCode || undefined
      );

      toast.success(auth('success.loginSuccess'));

      // Redirigir a home
      router.push('/icons');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === '2FA_REQUIRED') {
          setRequires2FA(true);
          toast.info(auth('actions.enter2FA'));
        } else {
          toast.error(error.message || auth('errors.loginFailed'));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-border/70 bg-card/90 px-5 py-6 shadow-sm sm:px-7 sm:py-8 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
      <div className="flex flex-col gap-6 lg:gap-10">
        <div className="space-y-2">
          <h1 className="font-kadwa text-4xl leading-none sm:text-5xl lg:font-medium lg:text-2xl lg:leading-tight lg:uppercase">
            {auth('screens.signIn.title')}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base lg:text-sm lg:leading-tight">
            {auth('screens.signIn.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground lg:sr-only">{common('fields.email')}</span>
            <Input
              type="email"
              placeholder={common('fields.email')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
              className="h-11 rounded-xl lg:h-9 lg:rounded-md"
              autoComplete="email"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground lg:sr-only">{common('fields.password')}</span>
            <Input
              type="password"
              placeholder={common('fields.password')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              className="h-11 rounded-xl lg:h-9 lg:rounded-md"
              autoComplete="current-password"
            />
          </label>

          {requires2FA && (
            <div className="rounded-[1.25rem] border border-primary/20 bg-primary/5 p-3 lg:rounded-lg lg:px-0 lg:py-0 lg:border-0 lg:bg-transparent">
              <p className="mb-3 text-sm text-foreground lg:sr-only">{auth('actions.enter2FA')}</p>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground lg:sr-only">{auth('twoFactor.code')}</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={auth('twoFactor.placeholder')}
                  value={formData.twoFactorCode}
                  onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value })}
                  maxLength={6}
                  disabled={isLoading}
                  className="h-11 rounded-xl lg:h-9 lg:rounded-md"
                />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Button type="submit" className="h-11 w-full rounded-xl text-base lg:mt-2 lg:h-9 lg:rounded-md lg:text-sm" disabled={isLoading}>
            {isLoading ? common('actions.loading') : auth('actions.signIn')}
          </Button>

          <p className="text-center text-sm leading-6 text-muted-foreground lg:mt-4 lg:text-sm lg:leading-normal">
            {auth('screens.signIn.noAccount')}{' '}
            <Link href="/auth/signup" className="font-medium text-foreground hover:underline">
              {auth('actions.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}


