"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";
import { getUserToken } from "@/lib/api/backend";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Cookies from "js-cookie";

export default function SuccessPage() {
    const t = useTranslations('premium');
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, refreshSession } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [npmToken, setNpmToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    useEffect(() => {
        async function fetchToken() {
            // Esperar a que termine de cargar el auth
            if (authLoading) {
                return;
            }

            // Marcar que ya verificamos auth
            if (!hasCheckedAuth) {
                setHasCheckedAuth(true);
            }

            try {
                // Verificar si está autenticado
                if (!isAuthenticated || !user) {
                    // Redirigir al login si no está autenticado
                    router.push('/auth/login');
                    return;
                }

                // Intentar obtener el token NPM de forma inteligente
                // 1. Refrescamos sesion para que el backend reconozca el nuevo rol si acaba de generarse
                await refreshSession();
                
                // 2. Pedir el token (hasta 3 intentos cortos si Stripe tardó en procesar)
                let attempts = 0;
                while (attempts < 3) {
                    attempts++;
                    setRetryCount(attempts);
                    try {
                        const tokenData = await getUserToken();
                        if (tokenData && typeof tokenData.token === 'string' && tokenData.token.length > 0) {
                            setNpmToken(tokenData.token);
                            localStorage.setItem('zcorvus_npm_token', tokenData.token);
                            setLoading(false);
                            toast.success(t('success.tokenGenerated') || 'Token generado exitosamente');
                            return;
                        }
                    } catch (err) {}
                    
                    if (attempts < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }

                // Si no se pudo obtener, reportarlo amablemente
                toast.error(t('success.tokenNotFound') || 'No se pudo obtener el token en este momento.');
                setLoading(false);
            } catch (error) {
                toast.error(t('errors.unknown') || 'Error inesperado');
                setLoading(false);
            }
        }

        fetchToken();
    }, [router, t, isAuthenticated, user, authLoading, hasCheckedAuth, refreshSession]);

    const copyToken = () => {
        if (npmToken) {
            navigator.clipboard.writeText(npmToken);
            toast.success(t('success.tokenCopied') || 'Token copiado');
        }
    };

    const downloadNpmrc = () => {
        if (!npmToken) return;

        const content = `# zCorvus Premium Access Token
# Token generado el ${new Date().toLocaleDateString()}

@zcorvus:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${npmToken}
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.npmrc';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('success.fileDownloaded') || 'Archivo descargado');
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
            <div className="max-w-2xl mx-auto text-center">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                        <ZIcon type="mina" name="check" className="text-green-600 dark:text-green-400" style={{ fontSize: '2.5rem' }} />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">
                        {t('success.title')}
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        {t('success.subtitle')}
                    </p>
                </div>

                {(authLoading || loading) ? (
                    <div className="py-8 space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-muted-foreground">{t('success.generatingToken')}</p>
                        <p className="text-sm text-muted-foreground">Intento {retryCount} de 10...</p>
                    </div>
                ) : npmToken ? (
                    <div className="space-y-6">
                        {/* Token Display */}
                        <div className="bg-card border-2 border-green-500/50 rounded-lg p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className="font-semibold text-lg">{t('success.npmToken')}</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('success.npmInstructions')}
                            </p>

                            <div className="bg-muted p-4 rounded-md font-mono text-xs break-all mb-4 border">
                                {npmToken}
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center">
                                <Button onClick={copyToken} variant="outline" size="sm">
                                    {t('success.copyToken')}
                                </Button>

                                <Button onClick={downloadNpmrc} variant="outline" size="sm">
                                    Descargar .npmrc
                                </Button>
                            </div>
                        </div>

                        {/* Instrucciones */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-left">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                {t('success.setupTitle')}
                            </h3>
                            <ol className="list-decimal list-inside space-y-3 text-sm">
                                <li className="text-muted-foreground">
                                    <strong className="text-foreground">Opción 1:</strong> Haz click en "Descargar .npmrc" y coloca el archivo en la raíz de tu proyecto
                                </li>
                                <li className="text-muted-foreground">
                                    <strong className="text-foreground">Opción 2:</strong> Crea manualmente un archivo <code className="bg-muted px-1 py-0.5 rounded">.npmrc</code> en la raíz de tu proyecto con este contenido:
                                    <pre className="bg-muted p-3 rounded mt-2 overflow-x-auto text-xs font-mono">
                                        {`@zcorvus:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${npmToken}`}
                                    </pre>
                                </li>
                                <li className="text-muted-foreground">
                                    <strong className="text-foreground">Instala el paquete:</strong>
                                    <pre className="bg-muted p-3 rounded mt-2 overflow-x-auto text-xs font-mono">
                                        npm install @zcorvus/z-icons-premium
                                        # o
                                        pnpm add @zcorvus/z-icons-premium
                                    </pre>
                                </li>
                            </ol>
                        </div>

                        {/* Botón para ver iconos */}
                        <div>
                            <Button onClick={() => router.push('/icons/premium/fa-solid')} variant="default" size="lg" className="w-full">
                                Ver Iconos Premium Ahora
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">¡Ya tienes acceso completo a todos los iconos premium!</p>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
                            <ZIcon type="mina" name="info" className="text-amber-600 dark:text-amber-400" style={{ fontSize: '2rem' }} />
                        </div>
                        <p className="text-muted-foreground mb-4">
                            El token está siendo generado. Esto puede tomar unos segundos.
                        </p>
                        <div className="space-y-2">
                            <Button onClick={() => window.location.reload()} variant="outline">
                                <ZIcon type="mina" name="refresh" className="mr-2" />
                                Reintentar
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Si el problema persiste, contacta a soporte
                            </p>
                        </div>
                    </div>
                )}

                {sessionId && (
                    <p className="text-xs text-muted-foreground mt-8">
                        Session ID: {sessionId}
                    </p>
                )}
            </div>
        </div>
    );
}
