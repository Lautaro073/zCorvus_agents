import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import type { AgentName } from '@/types/mcp';

export interface AgentAvatarProps {
  agent: AgentName;
  status: 'idle' | 'active' | 'in-progress' | 'blocked' | 'completed' | 'failed' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

const agentColors: Record<AgentName, string> = {
  Orchestrator: '#8b5cf6',
  Planner: '#ec4899',
  Observer: '#14b8a6',
  Frontend: '#3b82f6',
  Backend: '#f59e0b',
  Tester: '#ef4444',
  Documenter: '#06b6d4',
  AI_Workspace_Optimizer: '#84cc16',
};

const statusColors: Record<string, { dot: string; ring: string }> = {
  idle: { dot: '#64748b', ring: '#94a3b8' },
  active: { dot: '#10b981', ring: '#34d399' },
  'in-progress': { dot: '#3b82f6', ring: '#60a5fa' },
  blocked: { dot: '#ef4444', ring: '#f87171' },
  completed: { dot: '#16a34a', ring: '#4ade80' },
  failed: { dot: '#dc2626', ring: '#f87171' },
  pending: { dot: '#f59e0b', ring: '#fbbf24' },
};

const sizeClasses = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
};

const statusLabels: Record<AgentAvatarProps['status'], string> = {
  idle: 'inactivo',
  active: 'activo',
  'in-progress': 'en progreso',
  blocked: 'bloqueado',
  completed: 'completado',
  failed: 'fallido',
  pending: 'pendiente',
};

function AgentGlyph({ agent }: { agent: AgentName }) {
  const glyphProps = {
    fill: 'none',
    stroke: 'white',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (agent) {
    case 'Orchestrator':
      return (
        <g {...glyphProps}>
          <circle cx="32" cy="32" r="5" />
          <circle cx="18" cy="20" r="3" />
          <circle cx="46" cy="20" r="3" />
          <circle cx="18" cy="44" r="3" />
          <circle cx="46" cy="44" r="3" />
          <path d="M21 22l8 7m14-7l-8 7m-14 13l8-7m14 7l-8-7" />
        </g>
      );
    case 'Planner':
      return (
        <g {...glyphProps}>
          <rect x="18" y="16" width="28" height="32" rx="5" />
          <path d="M24 24h16M24 32h12M24 40h8" />
          <path d="M38 32l2 2 4-4" />
        </g>
      );
    case 'Observer':
      return (
        <g {...glyphProps}>
          <path d="M12 32s8-12 20-12 20 12 20 12-8 12-20 12S12 32 12 32z" />
          <circle cx="32" cy="32" r="6" />
        </g>
      );
    case 'Frontend':
      return (
        <g {...glyphProps}>
          <path d="M24 20l-9 12 9 12" />
          <path d="M40 20l9 12-9 12" />
          <path d="M34 18l-4 28" />
        </g>
      );
    case 'Backend':
      return (
        <g {...glyphProps}>
          <ellipse cx="32" cy="20" rx="13" ry="5" />
          <path d="M19 20v20c0 3 6 5 13 5s13-2 13-5V20" />
          <path d="M19 30c0 3 6 5 13 5s13-2 13-5" />
        </g>
      );
    case 'Tester':
      return (
        <g {...glyphProps}>
          <path d="M32 14l14 6v10c0 10-6 16-14 20-8-4-14-10-14-20V20l14-6z" />
          <path d="M24 32l6 6 10-10" />
        </g>
      );
    case 'Documenter':
      return (
        <g {...glyphProps}>
          <path d="M22 14h15l7 7v29H22z" />
          <path d="M37 14v8h7" />
          <path d="M26 31h12M26 37h12M26 43h8" />
        </g>
      );
    case 'AI_Workspace_Optimizer':
      return (
        <g {...glyphProps}>
          <circle cx="22" cy="40" r="2" fill="white" stroke="none" />
          <circle cx="32" cy="30" r="2" fill="white" stroke="none" />
          <circle cx="42" cy="22" r="2" fill="white" stroke="none" />
          <path d="M22 40l10-10 10-8" />
          <path d="M18 46h28" />
        </g>
      );
    default:
      return <circle cx="32" cy="32" r="10" fill="white" />;
  }
}

export function AgentAvatar({ agent, status, size = 'md', showStatus = true }: AgentAvatarProps) {
  const color = agentColors[agent] || '#64748B';
  const statusStyle = statusColors[status] || statusColors.idle;
  const stateClass = `avatar-state-${status}`;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', sizeClasses[size], stateClass)}
      role="img"
      aria-label={`${agent}, estado ${statusLabels[status]}`}
      style={{ '--avatar-ring-color': statusStyle.ring } as CSSProperties}
    >
      <svg viewBox="0 0 64 64" className="size-full overflow-visible">
        <defs>
          <radialGradient id={`avatar-bg-${agent}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill={`url(#avatar-bg-${agent})`} />
        <g className="avatar-glyph">
          <AgentGlyph agent={agent} />
        </g>
      </svg>

      <svg viewBox="0 0 64 64" className="pointer-events-none absolute inset-0 size-full -rotate-90">
        <circle
          className="avatar-ring"
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="var(--avatar-ring-color)"
          strokeWidth="3"
          strokeDasharray="188.5"
          strokeLinecap="round"
        />
      </svg>

      {showStatus && (
        <div
          className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background"
          style={{ backgroundColor: statusStyle.dot }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
