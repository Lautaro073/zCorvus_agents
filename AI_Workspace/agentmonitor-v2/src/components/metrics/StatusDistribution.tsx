import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { StatusDistribution as StatusDistributionType } from '@/hooks/useMetricsAggregations';

interface StatusDistributionProps {
  data: StatusDistributionType[];
}

const STATUS_COLORS: Record<string, string> = {
  TASK_COMPLETED: '#10b981',
  TASK_IN_PROGRESS: '#3b82f6',
  TASK_BLOCKED: '#ef4444',
  TASK_ASSIGNED: '#6b7280',
  TASK_ACCEPTED: '#f59e0b',
  TEST_PASSED: '#22c55e',
  TEST_FAILED: '#dc2626',
  INCIDENT_OPENED: '#dc2626',
  INCIDENT_RESOLVED: '#10b981',
};

export function StatusDistribution({ data }: StatusDistributionProps) {
  const chartData = data.map((d) => ({
    name: d.status.replace('TASK_', '').replace('INCIDENT_', '').replace('TEST_', ''),
    value: d.count,
    status: d.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_COLORS[entry.status] || '#6b7280'}
              stroke="var(--background)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'var(--foreground)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
