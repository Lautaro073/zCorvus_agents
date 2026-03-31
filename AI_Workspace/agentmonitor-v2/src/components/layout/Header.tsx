import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Bell,
  BellOff,
  CheckCheck,
  Clock3,
  FlaskConical,
  PauseCircle,
  PlayCircle,
  Search,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonitorStore } from '@/store/monitorStore';
import type { McpEvent } from '@/types/mcp';
import { getNormalizedEventStatus } from '@/lib/mcpStatus';
import { formatRelativeTime, getTimestampMs } from '@/lib/timestamp';

const NOTIFICATION_LIMIT = 8;

const TOAST_LIMIT = 3;
const TOAST_THROTTLE_MS = 15_000;

type NotificationSeverity = 'critical' | 'warn' | 'info';
type ToastFilter = 'critical' | 'all';

function getNotificationMeta(event: McpEvent): {
  label: string;
  Icon: typeof AlertCircle;
  badgeClass: string;
  severity: NotificationSeverity;
  toastEligible: boolean;
} {
  const status = getNormalizedEventStatus(event);

  if (status === 'INCIDENT_OPENED') {
    return {
      label: 'Incidente',
      Icon: AlertCircle,
      badgeClass: 'text-red-500',
      severity: 'critical',
      toastEligible: true,
    };
  }

  if (status === 'TASK_BLOCKED') {
    return {
      label: 'Bloqueada',
      Icon: Ban,
      badgeClass: 'text-amber-500',
      severity: 'critical',
      toastEligible: true,
    };
  }

  if (status === 'TEST_FAILED') {
    return {
      label: 'Test fallido',
      Icon: FlaskConical,
      badgeClass: 'text-rose-500',
      severity: 'critical',
      toastEligible: true,
    };
  }

  if (status === 'TASK_COMPLETED') {
    return {
      label: 'Completada',
      Icon: CheckCheck,
      badgeClass: 'text-emerald-500',
      severity: 'info',
      toastEligible: true,
    };
  }

  return {
    label: 'Actividad',
    Icon: Clock3,
    badgeClass: 'text-blue-500',
    severity: 'warn',
    toastEligible: false,
  };
}

function toToastKey(event: McpEvent, time: number): string {
  return event.eventId ?? `${event.taskId}-${event.type}-${time}`;
}

interface HeaderProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResultCount: number;
  notificationEvents: McpEvent[];
}

export function Header({
  searchQuery,
  onSearchQueryChange,
  searchResultCount,
  notificationEvents,
}: HeaderProps) {
  const { isConnected } = useMonitorStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [toastsEnabled, setToastsEnabled] = useState(true);
  const [toastsPaused, setToastsPaused] = useState(false);
  const [toastFilter, setToastFilter] = useState<ToastFilter>('critical');
  const [dismissedToasts, setDismissedToasts] = useState<string[]>([]);

  const dismissedSet = useMemo(() => new Set(dismissedToasts), [dismissedToasts]);

  const recentNotifications = useMemo(
    () =>
      [...notificationEvents]
        .sort(
          (a, b) =>
            (getTimestampMs(b.timestamp) ?? Number.NEGATIVE_INFINITY) -
            (getTimestampMs(a.timestamp) ?? Number.NEGATIVE_INFINITY)
        )
        .slice(0, NOTIFICATION_LIMIT),
    [notificationEvents]
  );

  const unreadCount = useMemo(
    () =>
      recentNotifications.filter((event) => {
        const eventTime = getTimestampMs(event.timestamp);
        return eventTime !== null && eventTime > lastReadAt;
      }).length,
    [lastReadAt, recentNotifications]
  );

  const markAllAsRead = () => {
    const newestNotificationTime = getTimestampMs(recentNotifications[0]?.timestamp) ?? Date.now();
    setLastReadAt(newestNotificationTime);
  };

  const handleOpenChange = (open: boolean) => {
    setNotificationsOpen(open);
    if (open) {
      markAllAsRead();
    }
  };

  const toastNotifications = useMemo(() => {
    if (!toastsEnabled || toastsPaused) {
      return [] as Array<{
        key: string;
        event: McpEvent;
        meta: ReturnType<typeof getNotificationMeta>;
      }>;
    }

    const sorted = [...notificationEvents].sort(
      (a, b) =>
        (getTimestampMs(b.timestamp) ?? Number.NEGATIVE_INFINITY) -
        (getTimestampMs(a.timestamp) ?? Number.NEGATIVE_INFINITY)
    );

    const result: Array<{
      key: string;
      event: McpEvent;
      meta: ReturnType<typeof getNotificationMeta>;
    }> = [];
    const seen = new Set<string>();
    let lastAcceptedTime: number | null = null;

    for (const event of sorted) {
      const eventTime = getTimestampMs(event.timestamp);
      if (eventTime === null) {
        continue;
      }

      const meta = getNotificationMeta(event);
      if (!meta.toastEligible) {
        continue;
      }

      if (toastFilter === 'critical' && meta.severity !== 'critical') {
        continue;
      }

      const key = toToastKey(event, eventTime);
      if (seen.has(key) || dismissedSet.has(key)) {
        continue;
      }

      if (lastAcceptedTime !== null && lastAcceptedTime - eventTime < TOAST_THROTTLE_MS) {
        continue;
      }

      result.push({ key, event, meta });
      seen.add(key);
      lastAcceptedTime = eventTime;

      if (result.length >= TOAST_LIMIT) {
        break;
      }
    }

    return result;
  }, [dismissedSet, notificationEvents, toastFilter, toastsEnabled, toastsPaused]);

  const dismissToast = (key: string) => {
    setDismissedToasts((prev) => [key, ...prev].slice(0, 200));
  };

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="header-search-input"
              placeholder="Buscar tareas..."
              className="pl-8"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>
          {searchQuery.trim() ? (
            <span className="text-xs text-muted-foreground" data-testid="header-search-results">
              {searchResultCount} resultados
            </span>
          ) : null}
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

          <Popover open={notificationsOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Abrir notificaciones"
                data-testid="notifications-bell"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-0" data-testid="notifications-popover">
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Notificaciones</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" />
                    Marcar leidas
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} sin leer` : 'Sin notificaciones sin leer'}
                </p>
              </div>

              <div className="border-b px-4 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={toastsEnabled ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setToastsEnabled((prev) => !prev)}
                    data-testid="notifications-toast-toggle"
                  >
                    {toastsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    {toastsEnabled ? 'Toasts on' : 'Toasts off'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!toastsEnabled}
                    onClick={() => setToastsPaused((prev) => !prev)}
                    data-testid="notifications-toast-pause"
                  >
                    {toastsPaused ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                    {toastsPaused ? 'Reanudar' : 'Pausar'}
                  </Button>
                  <Select
                    value={toastFilter}
                    onValueChange={(value) => setToastFilter(value as ToastFilter)}
                    disabled={!toastsEnabled}
                  >
                    <SelectTrigger className="h-7 w-[124px] text-xs" data-testid="notifications-toast-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Solo criticas</SelectItem>
                      <SelectItem value="all">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No hay eventos recientes.</div>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto px-3 py-3">
                  {recentNotifications.map((event, index) => {
                    const { Icon, label, badgeClass } = getNotificationMeta(event);
                    const eventTime = getTimestampMs(event.timestamp);
                    const isUnread = eventTime !== null && eventTime > lastReadAt;

                    return (
                      <li
                        key={event.eventId ?? `${event.taskId}-${event.timestamp}-${index}`}
                        className="rounded-md border border-border/60 bg-background/80 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${badgeClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </span>
                          {isUnread ? <span className="h-2 w-2 rounded-full bg-primary" aria-label="Sin leer" /> : null}
                        </div>

                        <p className="line-clamp-2 text-sm">{event.payload?.message || event.status || event.type}</p>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span>{event.agent}</span>
                          <span>{formatRelativeTime(event.timestamp)}</span>
                        </div>

                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{event.taskId}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {!notificationsOpen && toastNotifications.length > 0 ? (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-40 w-[320px] space-y-2"
          aria-live="polite"
          aria-atomic="false"
          data-testid="notifications-toast-region"
        >
          {toastNotifications.map((toast) => {
            const { Icon, label, badgeClass, severity } = toast.meta;
            const borderTone =
              severity === 'critical'
                ? 'border-red-500/30'
                : severity === 'warn'
                  ? 'border-amber-500/30'
                  : 'border-emerald-500/30';

            return (
              <article
                key={toast.key}
                role="status"
                aria-live={severity === 'critical' ? 'assertive' : 'polite'}
                className={`pointer-events-none rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur ${borderTone}`}
                data-testid="notification-toast"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${badgeClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                    <p className="line-clamp-2 text-sm">{toast.event.payload?.message || toast.event.type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {toast.event.agent} · {formatRelativeTime(toast.event.timestamp)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto h-6 w-6 shrink-0"
                    aria-label="Cerrar toast"
                    onClick={() => dismissToast(toast.key)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
