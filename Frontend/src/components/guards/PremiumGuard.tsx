"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumGuardProps {
    children: React.ReactNode;
    requiredForTypes?: string[];
}

/**
 * Componente que protege contenido premium
 * Redirige a /premium si el usuario no tiene acceso
 */
export function PremiumGuard({ children, requiredForTypes = ['premium', 'fa-solid', 'fa-regular'] }: PremiumGuardProps) {
    const { hasAccess, isLoading } = usePremiumAccess();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    useEffect(() => {
        // Verificar si la ruta actual requiere premium
        const isPremiumRoute = requiredForTypes.some(type => pathname.includes(`/icons/${type}`));

        if (!isPremiumRoute) return;

        if (!isLoading) {
            // Si no está autenticado, redirigir a login
            if (!isAuthenticated) {
                router.push('/auth/login');
                return;
            }

            // Si está autenticado pero no tiene acceso premium, redirigir a página de planes
            if (!hasAccess) {
                router.push('/premium');
            }
        }
    }, [hasAccess, isLoading, pathname, router, locale, requiredForTypes, isAuthenticated]);

    // Mientras carga, mostrar skeleton
    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 h-full">
                <div className="flex items-center justify-between">
                    <div className="w-[600px] h-10 bg-muted animate-pulse rounded-md" />
                    <div className="w-10 h-10 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
                    ))}
                </div>
            </div>
        );
    }

    // Si no tiene acceso, no mostrar nada (ya se está redirigiendo)
    if (!hasAccess) {
        return null;
    }

    // Si tiene acceso, mostrar contenido
    return <>{children}</>;
}
