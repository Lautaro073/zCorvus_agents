import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, Plus, Trash2 } from 'lucide-react';

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    agent: string | null;
    status: string | null;
    searchQuery: string;
    quickFilters: string[];
  };
}

interface FilterPresetsProps {
  currentFilters: {
    agent: string | null;
    status: string | null;
    searchQuery: string;
    quickFilters: string[];
  };
  onApplyPreset: (filters: FilterPreset['filters']) => void;
}

const STORAGE_KEY = 'monitor-filter-presets';

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) as FilterPreset[];
    } catch {
      console.error('Failed to parse filter presets');
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const savePreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      filters: { ...currentFilters },
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewPresetName('');
    setIsOpen(false);
  }, [newPresetName, currentFilters, presets]);

  const deletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [presets]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Presets
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Presets guardados</div>

          {presets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay presets guardados</div>
          ) : (
            <div className="space-y-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                  onClick={() => {
                    onApplyPreset(preset.filters);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm truncate">{preset.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del preset"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 text-sm border rounded px-2 py-1"
                onKeyDown={(e) => e.key === 'Enter' && savePreset()}
              />
              <Button size="sm" onClick={savePreset} disabled={!newPresetName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
