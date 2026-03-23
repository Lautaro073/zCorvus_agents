"use client";

import { useEffect, useState } from 'react';
import { getUserToken } from '@/lib/api/backend';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumAccessResult {
    hasAccess: boolean;
    isLoading: boolean;
    isPremium: boolean;
    refetch: () => Promise<void>;
}

/**
 * Hook para verificar si el usuario tiene acceso premium
 * Usa el backend Express con JWT
 */
export function usePremiumAccess(): PremiumAccessResult {
    const { user, isLoading: authLoading } = useAuth();
    const [hasAccess, setHasAccess] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    async function checkAccess() {
        try {
            setIsLoading(true);

            // Verificar si hay usuario autenticado
            if (!user) {
                setHasAccess(false);
                setIsPremium(false);
                return;
            }

            // Verificar si es usuario Pro (roles_id === 3)
            const isProUser = user.roles_id === 3 || user.role_name === 'pro';
            setIsPremium(isProUser);

            if (isProUser) {
                // Verificar si tiene token NPM activo
                const tokenData = await getUserToken();
                setHasAccess(!!tokenData?.token);
            } else {
                setHasAccess(false);
            }
        } catch (error) {
            console.error('Error checking premium access:', error);
            setHasAccess(false);
            setIsPremium(false);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        // Solo verificar cuando el usuario ya esté cargado
        if (!authLoading) {
            checkAccess();
        }
    }, [user, authLoading]);

    return {
        hasAccess,
        isLoading,
        isPremium,
        refetch: checkAccess
    };
}
