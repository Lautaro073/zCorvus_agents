"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/navigation";

export default function SignupPage() {
  const t = useTranslations('auth');
  const common = useTranslations('common');
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('errors.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.username, formData.email, formData.password);

      toast.success(t('success.registerSuccess'));

      // Redirigir a home
      router.push('/icons');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || t('errors.registerFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 sm:w-[300px]">
      <div className="flex flex-col gap-2">
        <h1 className="font-medium text-2xl uppercase">{t('screens.signUp.title')}</h1>
        <p className="text-muted-foreground text-sm leading-tight">{t('screens.signUp.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          placeholder={common('fields.username')}
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          disabled={isLoading}
        />
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
          minLength={6}
          disabled={isLoading}
        />
        <Input
          type="password"
          placeholder={common('fields.confirmPassword')}
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          minLength={6}
          disabled={isLoading}
        />

        <Button type="submit" className="w-full mt-2" disabled={isLoading}>
          {isLoading ? common('actions.loading') : t('actions.signUp')}
        </Button>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {t('screens.signUp.hasAccount')}{' '}
            <Link href="/auth/login" className="text-foreground hover:underline font-medium">
              {t('actions.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}


