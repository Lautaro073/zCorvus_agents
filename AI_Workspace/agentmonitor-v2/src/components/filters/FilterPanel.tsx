import { useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { QuickFilters } from './QuickFilters';
import { FilterPresets } from './FilterPresets';
import { DEFAULT_FILTERS, type FilterState } from './filterState';
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
  value: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterPanel({ value, onFilterChange }: FilterPanelProps) {
  const filters = value;

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    const updated = { ...filters, [key]: value };
    onFilterChange(updated);
  }, [filters, onFilterChange]);

  const toggleQuickFilter = useCallback((filterId: string) => {
    const quickFilters = filters.quickFilters.includes(filterId)
      ? filters.quickFilters.filter((filter) => filter !== filterId)
      : [...filters.quickFilters, filterId];
    onFilterChange({ ...filters, quickFilters });
  }, [filters, onFilterChange]);

  const resetFilters = useCallback(() => {
    onFilterChange(DEFAULT_FILTERS);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.agent !== null ||
    filters.status !== null ||
    filters.searchQuery !== '' ||
    filters.quickFilters.length > 0;

  return (
    <Card data-testid="settings-filter-panel">
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
              dataTestId="settings-search-query"
            />
          </div>
          <Select
            value={filters.agent ?? 'all'}
            onValueChange={(value) => updateFilter('agent', value === 'all' ? null : (value as AgentName))}
          >
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="settings-agent-select">
              <SelectValue placeholder="Todos los agentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los agentes</SelectItem>
              {AGENTS.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) => updateFilter('status', value === 'all' ? null : (value as McpStatus))}
          >
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="settings-status-select">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
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
              onFilterChange(updatedFilters);
            }}
          />
        </div>

        <div className="space-y-2" data-testid="settings-quick-filters">
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
