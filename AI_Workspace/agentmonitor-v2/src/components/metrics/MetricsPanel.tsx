import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThroughputChart } from './ThroughputChart';
import { CycleTimeChart } from './CycleTimeChart';
import { StatusDistribution } from './StatusDistribution';
import { useMetricsAggregations } from '@/hooks/useMetricsAggregations';

type TimeRange = '1h' | '6h' | '24h';

export function MetricsPanel() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const { throughputByAgent, cycleTimeData, statusDistribution, bottlenecks, summaryMetrics } =
    useMetricsAggregations(timeRange);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Metricas</h2>
        <div className="flex gap-2">
          {(['1h', '6h', '24h'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Eventos totales</CardDescription>
            <CardTitle className="text-3xl">{summaryMetrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-3xl text-green-500">{summaryMetrics.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En progreso</CardDescription>
            <CardTitle className="text-3xl text-blue-500">{summaryMetrics.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bloqueadas</CardDescription>
            <CardTitle className="text-3xl text-red-500">{summaryMetrics.blocked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="throughput" className="space-y-4">
        <TabsList>
          <TabsTrigger value="throughput">Rendimiento</TabsTrigger>
          <TabsTrigger value="cycle">Ciclo</TabsTrigger>
          <TabsTrigger value="distribution">Distribucion</TabsTrigger>
        </TabsList>

        <TabsContent value="throughput">
          <Card>
            <CardHeader>
              <CardTitle>Tareas por agente</CardTitle>
              <CardDescription>Completadas vs total por agente</CardDescription>
            </CardHeader>
            <CardContent>
              <ThroughputChart data={throughputByAgent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycle">
          <Card>
            <CardHeader>
              <CardTitle>Tiempo promedio de ciclo</CardTitle>
              <CardDescription>Tiempo promedio de cierre por agente</CardDescription>
            </CardHeader>
            <CardContent>
              <CycleTimeChart data={cycleTimeData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Distribucion por estado</CardTitle>
              <CardDescription>Distribucion de estados de tarea</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusDistribution data={statusDistribution} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {bottlenecks.length > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Cuellos de botella detectados</CardTitle>
            <CardDescription>Agentes con tareas bloqueadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bottlenecks.map((b) => (
                <div key={b.agent} className="flex items-center justify-between">
                  <span className="font-medium">{b.agent}</span>
                  <span className="text-red-500">{b.blockedCount} bloqueadas</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
