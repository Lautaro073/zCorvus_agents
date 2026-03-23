"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/lib/api/backend";
import { useAuth } from "@/contexts/AuthContext";

export default function PremiumPage() {
    const t = useTranslations('premium');
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async (planType: 'pro' | 'enterprise') => {
        setLoading(true);

        try {
            // Verificar si el usuario está autenticado
            if (!isAuthenticated) {
                toast.error(t('errors.notAuthenticated') || 'Debes iniciar sesión primero');
                router.push('/auth/login');
                return;
            }

            // Crear sesión de checkout con el backend Express
            const data = await createCheckoutSession(planType);

            // Redirigir a Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : t('errors.checkoutFailed') || 'Error al procesar el pago'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/icons')}
                className="absolute top-4 left-4 group"
            >
                <ZIcon
                    type="mina"
                    name="arrow-left"
                    className="size-6 group-hover:text-foreground transition-colors"
                />
            </Button>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Plan Pro */}
                    <div className="border rounded-lg p-8 bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-2 mb-4">
                            <ZIcon type="mina" name="star" className="text-amber-500" />
                            <h2 className="text-2xl font-bold">{t('plans.pro.name')}</h2>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-bold">$29.99</span>
                            <span className="text-muted-foreground">/mes</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.pro.features.icons')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.pro.features.npm')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.pro.features.updates')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.pro.features.support')}</span>
                            </li>
                        </ul>

                        <Button
                            onClick={() => handleCheckout('pro')}
                            disabled={loading}
                            className="w-full"
                            size="lg"
                        >
                            {loading ? t('processing') : t('plans.pro.cta')}
                        </Button>
                    </div>

                    {/* Plan Enterprise */}
                    <div className="border-2 border-primary rounded-lg p-8 bg-card hover:shadow-xl transition-shadow relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                            {t('plans.enterprise.badge')}
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <ZIcon type="mina" name="star" className="text-amber-500" />
                            <h2 className="text-2xl font-bold">{t('plans.enterprise.name')}</h2>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-bold">$49.99</span>
                            <span className="text-muted-foreground">/mes</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.enterprise.features.everything')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.enterprise.features.priority')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.enterprise.features.custom')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ZIcon type="mina" name="check" className="text-green-500 mt-1 flex-shrink-0" />
                                <span>{t('plans.enterprise.features.team')}</span>
                            </li>
                        </ul>

                        <Button
                            onClick={() => handleCheckout('enterprise')}
                            disabled={loading}
                            className="w-full"
                            size="lg"
                            variant="default"
                        >
                            {loading ? t('processing') : t('plans.enterprise.cta')}
                        </Button>
                    </div>
                </div>

                {/* FAQ or additional info */}
                <div className="mt-16 text-center text-sm text-muted-foreground">
                    <p>{t('guarantee')}</p>
                </div>
            </div>
        </div>
    );
}
