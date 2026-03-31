import { Badge } from '@/components/ui/badge';

interface QuickFiltersProps {
  activeFilters: Set<string>;
  onToggle: (filter: string) => void;
}

const QUICK_FILTERS = [
  { id: 'blocked', label: 'Solo bloqueadas', color: 'bg-red-500' },
  { id: 'in_progress', label: 'En progreso', color: 'bg-blue-500' },
  { id: 'completed', label: 'Completadas hoy', color: 'bg-green-500' },
  { id: 'incident', label: 'Incidentes', color: 'bg-red-600' },
];

export function QuickFilters({ activeFilters, onToggle }: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((filter) => (
        <Badge
          key={filter.id}
          data-testid={`settings-quick-filter-${filter.id}`}
          variant={activeFilters.has(filter.id) ? 'default' : 'outline'}
          className={`cursor-pointer transition-all ${
            activeFilters.has(filter.id) ? filter.color : ''
          }`}
          onClick={() => onToggle(filter.id)}
        >
          {filter.label}
        </Badge>
      ))}
    </div>
  );
}
