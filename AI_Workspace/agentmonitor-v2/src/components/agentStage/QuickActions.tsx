import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';

interface QuickActionsProps {
  taskId?: string;
  onViewDetails?: () => void;
  onCopyTaskId?: () => void;
}

export function QuickActions({ taskId, onViewDetails, onCopyTaskId }: QuickActionsProps) {
  const handleCopy = async () => {
    if (taskId) {
      await navigator.clipboard.writeText(taskId);
      onCopyTaskId?.();
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
    </div>
  );
}
