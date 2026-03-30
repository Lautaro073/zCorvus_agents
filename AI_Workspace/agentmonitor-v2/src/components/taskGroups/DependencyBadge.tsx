import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

interface DependencyBadgeProps {
  dependsOn: string[];
}

export function DependencyBadge({ dependsOn }: DependencyBadgeProps) {
  if (!dependsOn || dependsOn.length === 0) {
    return null;
  }

  return (
    <Badge variant="outline" className="gap-1">
      <GitBranch className="h-3 w-3" />
      {dependsOn.length}
    </Badge>
  );
}
