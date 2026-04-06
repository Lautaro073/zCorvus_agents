"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { 
    setCurrentAccessToken, 
    clearTokens, 
    getRefreshToken,
    setRefreshToken,
    login as backendLogin, 
    register as backendRegister, 
    logout as backendLogout, 
    getRefreshTokenFromServer,
    refreshAccessToken as backendRefreshAccessToken,
    type User 
} from '@/lib/api/backend';

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface RuntimeAuthSnapshot {
    user: User | null;
    accessToken: string | null;
    initialized: boolean;
}

const runtimeAuthSnapshot: RuntimeAuthSnapshot = {
    user: null,
    accessToken: null,
    initialized: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => runtimeAuthSnapshot.user);
    const [accessToken, setAccessToken] = useState<string | null>(() => runtimeAuthSnapshot.accessToken);
    const [isLoading, setIsLoading] = useState(() => !runtimeAuthSnapshot.initialized);
    const router = useRouter();

    // Sincronizar token con backend.ts cada vez que cambie
    useEffect(() => {
        setCurrentAccessToken(accessToken);
        runtimeAuthSnapshot.user = user;
        runtimeAuthSnapshot.accessToken = accessToken;
    }, [accessToken, user]);

    // Refrescar access token usando backend.ts
    const refreshAccessTokenInternal = useCallback(async (): Promise<string | null> => {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
            await logoutInternal();
            return null;
        }

        try {
            const data = await backendRefreshAccessToken();
            
            // Mapear role a role_name si es necesario
            const userObj = data.user;
            if (userObj && !userObj.role_name && (userObj as { role?: string }).role) {
                userObj.role_name = (userObj as unknown as { role: 'admin' | 'user' | 'pro' }).role;
            }

            setAccessToken(data.accessToken);
            setCurrentAccessToken(data.accessToken);
            setUser(userObj);
            runtimeAuthSnapshot.user = userObj;
            runtimeAuthSnapshot.accessToken = data.accessToken;
            runtimeAuthSnapshot.initialized = true;
            return data.accessToken;
        } catch {
            await logoutInternal();
            return null;
        }
    }, []);

    // Obtener refresh token del servidor (después de login/register)
    const storeRefreshToken = async (): Promise<void> => {
        try {
            const data = await getRefreshTokenFromServer();
            setRefreshToken(data.refreshToken, data.expiresAt);
        } catch (error) {
            console.error('Error getting refresh token:', error);
        }
    };

    // Login
    const login = async (email: string, password: string, twoFactorCode?: string) => {
        const data = await backendLogin(email, password, twoFactorCode);
        setAccessToken(data.accessToken);
        
        const userObj = data.user;
        if (userObj && !userObj.role_name && (userObj as { role?: string }).role) {
            userObj.role_name = (userObj as unknown as { role: 'admin' | 'user' | 'pro' }).role;
        }
        setUser(userObj);

        // Actualizamos backend.ts para que las llamadas subsecuentes tengan auth
        setCurrentAccessToken(data.accessToken);
        runtimeAuthSnapshot.user = userObj;
        runtimeAuthSnapshot.accessToken = data.accessToken;
        runtimeAuthSnapshot.initialized = true;
        await storeRefreshToken();
    };

    // Register
    const register = async (username: string, email: string, password: string) => {
        const data = await backendRegister(username, email, password);
        setAccessToken(data.accessToken);

        const userObj = data.user;
        if (userObj && !userObj.role_name && (userObj as { role?: string }).role) {
            userObj.role_name = (userObj as unknown as { role: 'admin' | 'user' | 'pro' }).role;
        }
        setUser(userObj);

        setCurrentAccessToken(data.accessToken);
        runtimeAuthSnapshot.user = userObj;
        runtimeAuthSnapshot.accessToken = data.accessToken;
        runtimeAuthSnapshot.initialized = true;
        await storeRefreshToken();
    };



    // Logout interno (sin redirigir)
    const logoutInternal = async () => {
        setAccessToken(null);
        setUser(null);
        runtimeAuthSnapshot.user = null;
        runtimeAuthSnapshot.accessToken = null;
        runtimeAuthSnapshot.initialized = true;
        clearTokens();
    };

    // Logout público (con redirección)
    const logout = async () => {
        try {
            if (accessToken) {
                await backendLogout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await logoutInternal();
            router.push('/auth/login');
        }
    };

    // Refrescar perfil manual (útil para premium success)
    const refreshSession = useCallback(async () => {
        await refreshAccessTokenInternal();
    }, [refreshAccessTokenInternal]);

    // Restaurar sesión al cargar la app
    useEffect(() => {
        if (runtimeAuthSnapshot.initialized) {
            setUser(runtimeAuthSnapshot.user);
            setAccessToken(runtimeAuthSnapshot.accessToken);
            setCurrentAccessToken(runtimeAuthSnapshot.accessToken);
            setIsLoading(false);
            return;
        }

        const restoreSession = async () => {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                await refreshAccessTokenInternal();
            }
            runtimeAuthSnapshot.initialized = true;
            setIsLoading(false);
        };
        restoreSession();
    }, [refreshAccessTokenInternal]);

    // Auto-refresh cada 4 minutos
    useEffect(() => {
        if (!accessToken) return;
        const interval = setInterval(async () => {
            await refreshAccessTokenInternal();
        }, 4 * 60 * 1000);
        return () => clearInterval(interval);
    }, [accessToken, refreshAccessTokenInternal]);

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
                refreshSession
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
