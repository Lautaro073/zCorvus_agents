import { Bell, Search, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMonitorStore } from '@/store/monitorStore';

export function Header() {
  const { isConnected } = useMonitorStore();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tareas..."
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Desconectado</span>
            </>
          )}
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}
