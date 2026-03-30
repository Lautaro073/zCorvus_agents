import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CycleTimeData } from '@/hooks/useMetricsAggregations';

interface CycleTimeChartProps {
  data: CycleTimeData[];
}



export function CycleTimeChart({ data }: CycleTimeChartProps) {
  const agentData = data.reduce((acc, task) => {
    if (!acc[task.agent]) {
      acc[task.agent] = { total: 0, count: 0 };
    }
    acc[task.agent].total += task.duration;
    acc[task.agent].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const chartData = Object.entries(agentData).map(([agent, stats]) => ({
    name: agent,
    avgDuration: Math.round(stats.total / stats.count / 60000),
    count: stats.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => `${value}m`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'var(--foreground)' }}
          formatter={(value: number) => [`${value} min`, 'Avg Cycle Time']}
        />
        <Bar dataKey="avgDuration" fill="#8b5cf6" name="Avg Duration" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
