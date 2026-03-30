import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HeroProps {
  totalEvents: number;
  liveEventsLastMinute: number;
  activeTasks: number;
  blockedTasks: number;
  isConnected: boolean;
}

export function Hero({
  totalEvents,
  liveEventsLastMinute,
  activeTasks,
  blockedTasks,
  isConnected,
}: HeroProps) {
  return (
    <motion.section
      data-testid="dashboard-hero"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-xl border bg-card p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--state-in-progress)/0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--state-active)/0.16),transparent_58%)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resumen operativo</p>
          <h2 className="text-3xl font-semibold tracking-tight">AgentMonitor V2</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Estado de orquestacion en vivo entre agentes MCP, tareas, incidentes y senales de build.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
              {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isConnected ? 'WebSocket conectado' : 'Desconectado'}
            </Badge>
            <Badge variant="outline">{liveEventsLastMinute} eventos/min</Badge>
          </div>
        </div>

        <div className="grid min-w-[260px] grid-cols-2 gap-3">
          <Stat label="Eventos totales" value={totalEvents} tone="neutral" />
          <Stat label="Tareas activas" value={activeTasks} tone="good" />
          <Stat label="Bloqueadas" value={blockedTasks} tone={blockedTasks > 0 ? 'danger' : 'good'} />
          <Stat label="Ritmo en vivo" value={liveEventsLastMinute} tone="warn" suffix="/min" />
        </div>
      </div>
    </motion.section>
  );
}

function Stat({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'good' | 'warn' | 'danger';
  suffix?: string;
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: 'border-border/70',
    good: 'border-emerald-400/40 bg-emerald-500/5',
    warn: 'border-amber-400/40 bg-amber-500/5',
    danger: 'border-red-400/40 bg-red-500/5',
  };

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass[tone]}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold leading-tight">
        {value}
        {suffix ? <span className="ml-1 text-xs font-medium text-muted-foreground">{suffix}</span> : null}
      </p>
    </div>
  );
}
