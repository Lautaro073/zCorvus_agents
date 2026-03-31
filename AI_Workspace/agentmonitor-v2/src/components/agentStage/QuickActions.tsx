import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';

interface QuickActionsProps {
  taskId?: string;
  onViewDetails?: () => void;
  onCopyTaskId?: () => void;
}

export function QuickActions({ taskId, onViewDetails, onCopyTaskId }: QuickActionsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timer = window.setTimeout(() => setCopyState('idle'), 1400);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    if (taskId) {
      try {
        await navigator.clipboard.writeText(taskId);
        onCopyTaskId?.();
        setCopyState('success');
      } catch {
        setCopyState('error');
      }
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">Acciones rapidas</h4>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onViewDetails}
          disabled={!onViewDetails}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ver detalle
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopy}
          disabled={!taskId}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          Copiar taskId
        </Button>
      </div>
      {copyState === 'success' ? (
        <p className="text-xs text-emerald-600" data-testid="quick-actions-copy-feedback">taskId copiado</p>
      ) : null}
      {copyState === 'error' ? (
        <p className="text-xs text-destructive" data-testid="quick-actions-copy-feedback">no se pudo copiar</p>
      ) : null}
    </div>
  );
}
