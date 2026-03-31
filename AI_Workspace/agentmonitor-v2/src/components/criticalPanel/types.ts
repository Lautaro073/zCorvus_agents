import type { McpEvent } from '@/types/mcp';

export type AlertSeverity = 'incident' | 'blocked' | 'test-failed';

export interface AlertGroupModel {
  key: string;
  severity: AlertSeverity;
  label: string;
  count: number;
  latest: McpEvent;
  events: McpEvent[];
}
