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
  const auth = useTranslations('auth');
  const common = useTranslations('common');
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

      toast.success(auth('success.loginSuccess') || '¡Bienvenido!');

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 sm:w-[300px]">
      <div className="flex flex-col gap-2">
        <h1 className="font-medium text-2xl uppercase">{auth('screens.signIn.title')}</h1>
        <p className="text-muted-foreground text-sm leading-tight">{auth('screens.signIn.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Input
          type="email"
          placeholder={common('fields.email')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isLoading}
        />
        <Input
          type="password"
          placeholder={common('fields.password')}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          disabled={isLoading}
        />

        {requires2FA && (
          <Input
            type="text"
            placeholder={auth('twoFactor.placeholder')}
            value={formData.twoFactorCode}
            onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value })}
            maxLength={6}
            disabled={isLoading}
          />
        )}

        <Button type="submit" className="w-full mt-2" disabled={isLoading}>
          {isLoading ? auth('actions.loading') : auth('actions.signIn')}
        </Button>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {auth('screens.signIn.noAccount')}{' '}
            <Link href="/auth/signup" className="text-foreground hover:underline font-medium">
              {auth('actions.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}


