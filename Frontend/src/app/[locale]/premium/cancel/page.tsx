"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";

export default function CancelPage() {
    const t = useTranslations('premium');
    const router = useRouter();

    return (
        <div className="container mx-auto px-4 py-16 relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/premium')}
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
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
                        <ZIcon type="mina" name="x" className="text-amber-600 dark:text-amber-400" style={{ fontSize: '2.5rem' }} />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">
                        {t('cancel.title')}
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        {t('cancel.subtitle')}
                    </p>
                </div>

                <div className="flex gap-4 justify-center">
                    <Button onClick={() => router.push('/premium')} variant="default">
                        {t('cancel.tryAgain')}
                    </Button>
                    <Button onClick={() => router.push('/icons')} variant="outline">
                        {t('cancel.backToIcons')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
