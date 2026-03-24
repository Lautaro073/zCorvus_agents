"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    // Registra el error en un sistema de logging o consola
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20">
        <ZIcon type="mina" name="alert-triangle" className="text-red-600 dark:text-red-400" style={{ fontSize: '2rem' }} />
      </div>
      <h2 className="text-2xl font-bold mb-4">
        {t("errors.somethingWentWrong") || "Algo salió mal"}
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {t("errors.unexpectedError") || "Ha ocurrido un error inesperado cargando la página. Por favor, intenta de nuevo."}
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          {t("actions.tryAgain") || "Intentar de nuevo"}
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="outline">
          {t("actions.goHome") || "Volver al inicio"}
        </Button>
      </div>
    </div>
  );
}
