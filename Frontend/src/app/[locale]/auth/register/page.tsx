"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/navigation";

export default function RegisterPage() {
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
            await register(formData.username, formData.email, formData.password, formData.confirmPassword);

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
        <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">{t('register.title')}</h1>
                    <p className="text-muted-foreground">{t('register.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium mb-2">
                            {common('fields.username')}
                        </label>
                        <Input
                            id="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="johndoe"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                            {common('fields.email')}
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="tu@email.com"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-2">
                            {common('fields.password')}
                        </label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                            {common('fields.confirmPassword')}
                        </label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            disabled={isLoading}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>{common('actions.loading')}</>
                        ) : (
                            <>{t('actions.signUp')}</>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('register.haveAccount')}{' '}
                        <Link href="/auth/login" className="text-primary hover:underline">
                            {t('actions.signIn')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
