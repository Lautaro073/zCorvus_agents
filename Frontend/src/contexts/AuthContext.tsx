"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { setCurrentAccessToken, clearTokens, type User } from '@/lib/api/backend';
import Cookies from 'js-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Cookie configuration
const COOKIE_OPTIONS = {
    expires: 30, // 30 días
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'lax' as const, // Protección CSRF
};

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Sincronizar token con backend.ts cada vez que cambie
    useEffect(() => {
        setCurrentAccessToken(accessToken);
    }, [accessToken]);

    // Verificar si un token JWT expiró
    const isTokenExpired = (token: string): boolean => {
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            return decoded.exp * 1000 < Date.now();
        } catch {
            return true;
        }
    };

    // Refrescar access token usando refresh token
    const refreshAccessTokenInternal = async (): Promise<string | null> => {
        const refreshToken = Cookies.get('refreshToken');

        if (!refreshToken) {
            await logoutInternal();
            return null;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                await logoutInternal();
                return null;
            }

            const { data } = await response.json();

            // Mapear role a role_name si es necesario
            const user = data?.user;
            if (user && !user.role_name && user.role) {
                user.role_name = user.role;
            }

            setAccessToken(data?.accessToken);
            setUser(user);
            return data?.accessToken || null;
        } catch (error) {
            await logoutInternal();
            return null;
        }
    };

    // Obtener refresh token del servidor (después de login/register)
    const getServerRefreshToken = async (token: string): Promise<void> => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn('Could not get refresh token from server');
                return;
            }

            const { data } = await response.json();
            Cookies.set('refreshToken', data.refreshToken, COOKIE_OPTIONS);
            Cookies.set('refreshTokenExpiry', data.expiresAt, COOKIE_OPTIONS);
        } catch (error) {
            console.error('Error getting refresh token:', error);
        }
    };

    // Login
    const login = async (email: string, password: string, twoFactorCode?: string) => {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, twoFactorCode }),
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.requires2FA) {
                throw new Error('2FA_REQUIRED');
            }
            throw new Error(result.message || 'Login failed');
        }

        // Guardar access token en estado (NO en localStorage)
        setAccessToken(result.data.accessToken);

        // Mapear role a role_name si es necesario
        const user = result.data.user;
        if (user && !user.role_name && user.role) {
            user.role_name = user.role;
        }
        setUser(user);

        // Obtener refresh token del servidor
        await getServerRefreshToken(result.data.accessToken);
    };

    // Register
    const register = async (username: string, email: string, password: string) => {
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Registration failed');
        }

        // Guardar access token en estado
        setAccessToken(result.data.accessToken);

        // Mapear role a role_name si es necesario
        const user = result.data.user;
        if (user && !user.role_name && user.role) {
            user.role_name = user.role;
        }
        setUser(user);

        // Obtener refresh token del servidor
        await getServerRefreshToken(result.data.accessToken);
    };

    // Logout interno (sin redirigir)
    const logoutInternal = async () => {
        setAccessToken(null);
        setUser(null);
        clearTokens();

        // Limpiar cookies
        Cookies.remove('refreshToken');
        Cookies.remove('refreshTokenExpiry');
    };

    // Logout público (con redirección)
    const logout = async () => {
        try {
            if (accessToken) {
                await fetch(`${BACKEND_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await logoutInternal();
            router.push('/auth/login');
        }
    };

    // Restaurar sesión al cargar la app
    useEffect(() => {
        const restoreSession = async () => {
            const refreshToken = Cookies.get('refreshToken');

            if (refreshToken) {
                await refreshAccessTokenInternal();
            }
            setIsLoading(false);
        };
        restoreSession();
    }, []);

    // Auto-refresh cada 4 minutos (antes de que expire a los 5)
    useEffect(() => {
        if (!accessToken) return;

        const interval = setInterval(async () => {
            await refreshAccessTokenInternal();
        }, 4 * 60 * 1000); // 4 minutos

        return () => clearInterval(interval);
    }, [accessToken]);

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isLoading,
                isAuthenticated: !!user && !!accessToken,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
