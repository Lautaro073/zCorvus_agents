import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';

export const INVALID_DATE_LABEL = 'sin fecha';

export function getTimestampMs(timestamp: string | null | undefined): number | null {
  if (!timestamp) {
    return null;
  }

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

export function getDateOrNull(timestamp: string | null | undefined): Date | null {
  const ms = getTimestampMs(timestamp);
  return ms === null ? null : new Date(ms);
}

export function getMinuteBucketIso(timestamp: string | null | undefined): string | null {
  const date = getDateOrNull(timestamp);
  if (!date) {
    return null;
  }

  date.setSeconds(0, 0);
  return date.toISOString();
}

export function formatShortTime(timestamp: string | null | undefined, fallback = INVALID_DATE_LABEL): string {
  const date = getDateOrNull(timestamp);
  if (!date) {
    return fallback;
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(timestamp: string | null | undefined, fallback = INVALID_DATE_LABEL): string {
  const date = getDateOrNull(timestamp);
  if (!date) {
    return fallback;
  }

  return formatDistanceToNowStrict(date, {
    addSuffix: true,
    locale: es,
  });
}
