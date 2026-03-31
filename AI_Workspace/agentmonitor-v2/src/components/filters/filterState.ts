import type { AgentName, McpStatus } from '@/types/mcp';

export interface FilterState {
  agent: AgentName | null;
  status: McpStatus | null;
  searchQuery: string;
  quickFilters: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  agent: null,
  status: null,
  searchQuery: '',
  quickFilters: [],
};
