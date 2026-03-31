import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from './MetricCard';
import type { DashboardMetric } from '@/hooks/useDashboardMetrics';

interface SummaryGridProps {
  metrics: DashboardMetric[];
  isLoading: boolean;
}

export function SummaryGrid({ metrics, isLoading }: SummaryGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="rounded-xl border p-4">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="mb-2 h-7 w-16" />
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={metric.id} metric={metric} index={index} />
      ))}
    </div>
  );
}
