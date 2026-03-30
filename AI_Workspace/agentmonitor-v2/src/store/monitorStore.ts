import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentName, McpEvent, McpStatus } from '@/types/mcp';

interface AgentFilter {
  agent: AgentName | null;
  status: McpStatus | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
}

interface MonitorState {
  focusedAgent: AgentName | null;
  agentFilters: AgentFilter;
  setFocusedAgent: (agent: AgentName | null) => void;
  setAgentFilter: (filter: Partial<AgentFilter>) => void;
  resetAgentFilters: () => void;
  events: McpEvent[];
  setEvents: (events: McpEvent[]) => void;
  addEvent: (event: McpEvent) => void;
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

const defaultFilters: AgentFilter = {
  agent: null,
  status: null,
  dateRange: {
    start: null,
    end: null,
  },
  searchQuery: '',
};

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set) => ({
      focusedAgent: null,
      agentFilters: defaultFilters,
      setFocusedAgent: (agent) => set({ focusedAgent: agent }),
      setAgentFilter: (filter) =>
        set((state) => ({
          agentFilters: { ...state.agentFilters, ...filter },
        })),
      resetAgentFilters: () => set({ agentFilters: defaultFilters }),
      events: [],
      setEvents: (events) => set({ events }),
      addEvent: (event) =>
        set((state) => ({
          events: [event, ...state.events].slice(0, 1000),
        })),
      isConnected: false,
      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: 'monitor-storage',
      partialize: (state) => ({
        focusedAgent: state.focusedAgent,
        agentFilters: state.agentFilters,
      }),
    }
  )
);
