import { motion } from 'framer-motion';
import { TrendingUp, TriangleAlert, CircleCheck, Activity } from 'lucide-react';
import { useMemo, type ComponentType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardMetric } from '@/hooks/useDashboardMetrics';

const toneConfig: Record<DashboardMetric['tone'], { icon: ComponentType<{ className?: string }>; color: string }> = {
  neutral: { icon: Activity, color: '#60A5FA' },
  good: { icon: CircleCheck, color: '#34D399' },
  warn: { icon: TrendingUp, color: '#FBBF24' },
  danger: { icon: TriangleAlert, color: '#F87171' },
};

interface MetricCardProps {
  metric: DashboardMetric;
  index: number;
}

export function MetricCard({ metric, index }: MetricCardProps) {
  const tone = toneConfig[metric.tone];
  const Icon = tone.icon;

  const linePoints = useMemo(() => {
    if (metric.trend.length === 0) {
      return '';
    }

    const values = metric.trend.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const maxIndex = Math.max(metric.trend.length - 1, 1);

    return metric.trend
      .map((point, index) => {
        const x = (index / maxIndex) * 100;
        const y = 100 - ((point.value - min) / range) * 100;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [metric.trend]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.deltaLabel}</p>
          </div>
          <div className="h-16 w-full rounded-md bg-muted/25 p-2">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                points={linePoints}
                fill="none"
                stroke={tone.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
