import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface TimelineFiltersProps {
  activeFilters: string[];
  searchQuery: string;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

const filterOptions = [
  { id: 'TASK_ASSIGNED', label: 'Asignada' },
  { id: 'TASK_IN_PROGRESS', label: 'En progreso' },
  { id: 'TASK_COMPLETED', label: 'Completada' },
  { id: 'TASK_BLOCKED', label: 'Bloqueada' },
  { id: 'TEST_PASSED', label: 'Test ok' },
  { id: 'TEST_FAILED', label: 'Test fail' },
  { id: 'INCIDENT_OPENED', label: 'Incidente' },
  { id: 'ARTIFACT_PUBLISHED', label: 'Artefactos' },
];

export function TimelineFilters({
  activeFilters,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onClearFilters,
}: TimelineFiltersProps) {
  return (
    <div className="space-y-3" data-testid="timeline-filters">
      <div className="relative" data-testid="timeline-filters-search">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="timeline-search-input"
          placeholder="Buscar por taskId o mensaje..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap gap-2" data-testid="timeline-status-filters">
        {filterOptions.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilters.includes(filter.id) ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className="text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros activos:</span>
          {activeFilters.map((filter) => (
            <Badge 
              key={filter} 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => onFilterChange(filter)}
            >
              {filter}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-muted-foreground"
          >
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
}
