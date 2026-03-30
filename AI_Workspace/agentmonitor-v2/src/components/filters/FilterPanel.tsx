import { useState, useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { QuickFilters } from './QuickFilters';
import { FilterPresets } from './FilterPresets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { AgentName, McpStatus } from '@/types/mcp';

const AGENTS: AgentName[] = [
  'Orchestrator',
  'Planner',
  'Observer',
  'Frontend',
  'Backend',
  'Tester',
  'Documenter',
  'AI_Workspace_Optimizer',
];

const STATUSES: McpStatus[] = [
  'TASK_ASSIGNED',
  'TASK_ACCEPTED',
  'TASK_IN_PROGRESS',
  'TASK_COMPLETED',
  'TASK_BLOCKED',
  'TASK_CANCELLED',
  'TEST_PASSED',
  'TEST_FAILED',
  'INCIDENT_OPENED',
  'INCIDENT_RESOLVED',
];

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  agent: AgentName | null;
  status: McpStatus | null;
  searchQuery: string;
  quickFilters: string[];
}

const DEFAULT_FILTERS: FilterState = {
  agent: null,
  status: null,
  searchQuery: '',
  quickFilters: [],
};

export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      onFilterChange(updated);
      return updated;
    });
  }, [onFilterChange]);

  const toggleQuickFilter = useCallback((filterId: string) => {
    setFilters((prev) => {
      const quickFilters = prev.quickFilters.includes(filterId)
        ? prev.quickFilters.filter((f) => f !== filterId)
        : [...prev.quickFilters, filterId];
      const updated = { ...prev, quickFilters };
      onFilterChange(updated);
      return updated;
    });
  }, [onFilterChange]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.agent !== null ||
    filters.status !== null ||
    filters.searchQuery !== '' ||
    filters.quickFilters.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={filters.searchQuery}
              onChange={(value) => updateFilter('searchQuery', value)}
              placeholder="Buscar por taskId o correlationId..."
            />
          </div>
          <Select
            value={filters.agent || ''}
            onValueChange={(value) => updateFilter('agent', (value as AgentName) || null)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos los agentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los agentes</SelectItem>
              {AGENTS.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status || ''}
            onValueChange={(value) => updateFilter('status', (value as McpStatus) || null)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('TASK_', '').replace('INCIDENT_', '').replace('TEST_', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FilterPresets
            currentFilters={filters}
            onApplyPreset={(preset) => {
              const updatedFilters: FilterState = {
                ...filters,
                agent: (preset.agent as AgentName) ?? null,
                status: (preset.status as McpStatus) ?? null,
                searchQuery: preset.searchQuery,
                quickFilters: preset.quickFilters,
              };
              setFilters(updatedFilters);
              onFilterChange(updatedFilters);
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Filtros rapidos</div>
          <QuickFilters
            activeFilters={new Set(filters.quickFilters)}
            onToggle={toggleQuickFilter}
          />
        </div>
      </CardContent>
    </Card>
  );
}
