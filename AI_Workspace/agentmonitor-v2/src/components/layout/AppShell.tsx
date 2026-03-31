import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { McpEvent } from '@/types/mcp';

interface AppShellProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigateSection: (sectionId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResultCount: number;
  notificationEvents: McpEvent[];
}

export function AppShell({
  children,
  activeSection,
  onNavigateSection,
  searchQuery,
  onSearchQueryChange,
  searchResultCount,
  notificationEvents,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection={activeSection}
        onNavigate={onNavigateSection}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchResultCount={searchResultCount}
          notificationEvents={notificationEvents}
        />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
