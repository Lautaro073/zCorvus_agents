import { AgentAvatar, type AgentAvatarProps } from './AgentAvatar';
import { Badge } from '@/components/ui/badge';
import type { AgentName } from '@/types/mcp';

interface MiniTeamProps {
  agents: { name: AgentName; status: string; taskCount: number }[];
  onAgentClick?: (agent: AgentName) => void;
}

export function MiniTeam({ agents, onAgentClick }: MiniTeamProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">Equipo</h4>
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => (
          <button
            key={agent.name}
            onClick={() => onAgentClick?.(agent.name)}
            className="flex items-center gap-2 rounded-lg border bg-card p-2 hover:bg-accent transition-colors"
          >
            <AgentAvatar 
              agent={agent.name} 
              status={agent.status as AgentAvatarProps['status']} 
              size="sm" 
            />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium">{agent.name}</span>
              <Badge variant="secondary" className="h-4 text-[10px] px-1">
                {agent.taskCount} tareas
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
