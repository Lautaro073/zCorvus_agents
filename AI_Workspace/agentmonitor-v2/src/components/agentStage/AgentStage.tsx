import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar, type AgentAvatarProps } from './AgentAvatar';
import { MiniTeam } from './MiniTeam';
import { QuickActions } from './QuickActions';
import type { AgentName } from '@/types/mcp';

interface AgentStageProps {
  focusedAgent: AgentName | null;
  agentStatus: string;
  taskId?: string;
  recentActivity?: { type: string; message: string; timestamp: string }[];
  teamMembers?: { name: AgentName; status: string; taskCount: number }[];
  onAgentClick?: (agent: AgentName) => void;
  onViewDetails?: () => void;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  idle: { label: 'Inactivo', className: 'bg-slate-500' },
  active: { label: 'Activo', className: 'bg-emerald-500' },
  'in-progress': { label: 'En progreso', className: 'bg-blue-500' },
  blocked: { label: 'Bloqueado', className: 'bg-red-500' },
  completed: { label: 'Completado', className: 'bg-emerald-600' },
  failed: { label: 'Fallido', className: 'bg-red-600' },
  pending: { label: 'Pendiente', className: 'bg-amber-500' },
};

export function AgentStage({
  focusedAgent,
  agentStatus,
  taskId,
  recentActivity = [],
  teamMembers = [],
  onAgentClick,
  onViewDetails,
}: AgentStageProps) {
  const statusInfo = statusLabels[agentStatus] || statusLabels.idle;

  if (!focusedAgent) {
    return (
      <Card>
          <CardHeader>
            <CardTitle>Panel del agente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Selecciona un agente para ver detalles</p>
          </CardContent>
        </Card>
      );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <AgentAvatar 
              agent={focusedAgent} 
              status={agentStatus as AgentAvatarProps['status']} 
              size="lg" 
            />
            <div>
              <div className="text-lg">{focusedAgent}</div>
              <Badge className={`${statusInfo.className} text-white mt-1`}>
                {statusInfo.label}
              </Badge>
            </div>
          </CardTitle>
          {taskId && (
            <div className="text-xs text-muted-foreground font-mono">
              {taskId}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {recentActivity.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Actividad reciente</h4>
            <div className="space-y-2">
              {recentActivity.slice(0, 3).map((activity, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <div>
                    <span className="font-medium">{activity.type}</span>
                    <p className="text-muted-foreground text-xs">{activity.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teamMembers.length > 0 && (
          <MiniTeam agents={teamMembers} onAgentClick={onAgentClick} />
        )}

        <QuickActions 
          taskId={taskId} 
          onViewDetails={onViewDetails}
        />
      </CardContent>
    </Card>
  );
}
