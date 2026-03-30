import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  AlertTriangle, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Panel', href: '#dashboard' },
  { icon: Users, label: 'Agentes', href: '#agents' },
  { icon: Activity, label: 'Timeline', href: '#timeline' },
  { icon: AlertTriangle, label: 'Critico', href: '#critical' },
  { icon: Settings, label: 'Ajustes', href: '#settings' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-center border-b px-4">
        {!collapsed && (
          <h1 className="text-lg font-bold tracking-tight">AgentMonitor</h1>
        )}
        {collapsed && (
          <span className="text-lg font-bold">AM</span>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground",
              "hover:bg-accent hover:text-accent-foreground transition-colors"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
