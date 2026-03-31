import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AlertGroupModel } from './types';

interface QuickResolveProps {
  alert: AlertGroupModel | null;
  onClose: () => void;
}

export function QuickResolve({ alert, onClose }: QuickResolveProps) {
  const [copyState, setCopyState] = useState<{
    state: 'idle' | 'success' | 'error';
    taskId: string | null;
  }>({ state: 'idle', taskId: null });

  useEffect(() => {
    if (copyState.state === 'idle') {
      return;
    }

    const timer = window.setTimeout(
      () => setCopyState({ state: 'idle', taskId: copyState.taskId }),
      1400
    );
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const details = useMemo(() => {
    if (!alert) {
      return null;
    }

    const latest = alert.latest;
    return {
      taskId: latest.taskId,
      correlationId: latest.correlationId,
      rootCause:
        (latest.payload?.rootCause as string | undefined) ||
        latest.payload?.message ||
        'Sin causa raiz informada',
      artifacts: latest.payload?.artifactPaths || [],
      agent: latest.agent,
      status: latest.status || latest.type,
    };
  }, [alert]);

  return (
    <AnimatePresence>
      {alert && details ? (
        <>
          <motion.button
            aria-label="Cerrar panel de resolucion rapida"
            className="absolute inset-0 z-10 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            data-testid="quick-resolve-panel"
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="absolute inset-y-0 right-0 z-20 w-full max-w-sm border-l bg-card p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Resolucion rapida</h4>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <InfoRow label="Severidad" value={alert.label} />
              <InfoRow label="Agente" value={details.agent} />
              <InfoRow label="Estado" value={details.status} />
              <InfoRow label="Tarea" value={details.taskId} mono />
              <InfoRow label="Correlacion" value={details.correlationId} mono />

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Causa raiz</p>
                <p className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
                  {details.rootCause}
                </p>
              </div>

              {details.artifacts.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Artefactos</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {details.artifacts.map((path) => (
                      <li key={path} className="truncate rounded border bg-background px-2 py-1">
                        {path}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Button
                data-testid="quick-resolve-copy-task"
                className="w-full gap-2"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(details.taskId);
                    setCopyState({ state: 'success', taskId: details.taskId });
                  } catch {
                    setCopyState({ state: 'error', taskId: details.taskId });
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                Copiar taskId
              </Button>
              {copyState.state === 'success' && copyState.taskId === details.taskId ? (
                <p className="text-xs text-emerald-600" data-testid="quick-resolve-copy-feedback">taskId copiado</p>
              ) : null}
              {copyState.state === 'error' && copyState.taskId === details.taskId ? (
                <p className="text-xs text-destructive" data-testid="quick-resolve-copy-feedback">no se pudo copiar</p>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-xs' : 'text-sm'}>{value}</p>
    </div>
  );
}
