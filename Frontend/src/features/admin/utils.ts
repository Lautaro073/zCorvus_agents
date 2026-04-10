import type {
  AdminMetricsGranularity,
  AdminRole,
  AdminSubscriptionStatus,
  AdminSortBy,
  AdminSortDir,
  GetAdminMetricsParams,
  GetAdminSubscriptionsParams,
  GetAdminUsersParams,
} from "@/lib/api/backend";

const ADMIN_USER_ROLES: ReadonlyArray<AdminRole> = ["admin", "user", "pro"];
const ADMIN_SUBSCRIPTION_STATUSES: ReadonlyArray<AdminSubscriptionStatus> = ["active", "expiring", "expired", "none"];
const ADMIN_SUBSCRIPTION_STATUSES_NO_NONE: ReadonlyArray<Exclude<AdminSubscriptionStatus, "none">> = ["active", "expiring", "expired"];
const ADMIN_SORT_BY_VALUES: ReadonlyArray<AdminSortBy> = ["id", "created_at", "username", "email", "role_name", "token_finish_date"];
const ADMIN_SORT_DIR_VALUES: ReadonlyArray<AdminSortDir> = ["asc", "desc"];
const ADMIN_GRANULARITIES = ["day", "month", "year", "custom"] as const;

function isAdminMetricsGranularity(value: string): value is AdminMetricsGranularity {
  return ADMIN_GRANULARITIES.includes(value as (typeof ADMIN_GRANULARITIES)[number]);
}

function isNumberInRange(value: string, min: number, max: number): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return undefined;
  }

  return parsed;
}

function isIsoLike(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function parseUsersParamsFromSearch(searchParams: URLSearchParams): GetAdminUsersParams {
  const roleRaw = searchParams.get("role") ?? "";
  const statusRaw = searchParams.get("subscriptionStatus") ?? "";
  const sortByRaw = searchParams.get("sortBy") ?? "";
  const sortDirRaw = searchParams.get("sortDir") ?? "";
  const pageRaw = searchParams.get("usersPage") ?? "";
  const pageSizeRaw = searchParams.get("usersPageSize") ?? "";
  const expiringInDaysRaw = searchParams.get("expiringInDays") ?? "";

  return {
    page: isNumberInRange(pageRaw, 1, 100000) ?? 1,
    pageSize: isNumberInRange(pageSizeRaw, 1, 100) ?? 20,
    search: searchParams.get("search") || undefined,
    role: ADMIN_USER_ROLES.includes(roleRaw as AdminRole) ? (roleRaw as AdminRole) : undefined,
    subscriptionStatus: ADMIN_SUBSCRIPTION_STATUSES.includes(statusRaw as AdminSubscriptionStatus)
      ? (statusRaw as AdminSubscriptionStatus)
      : undefined,
    sortBy: ADMIN_SORT_BY_VALUES.includes(sortByRaw as AdminSortBy) ? (sortByRaw as AdminSortBy) : "id",
    sortDir: ADMIN_SORT_DIR_VALUES.includes(sortDirRaw as AdminSortDir) ? (sortDirRaw as AdminSortDir) : "desc",
    expiringInDays: isNumberInRange(expiringInDaysRaw, 1, 365) ?? 7,
  };
}

export function parseSubscriptionsParamsFromSearch(searchParams: URLSearchParams): GetAdminSubscriptionsParams {
  const statusRaw = searchParams.get("subStatus") ?? "";
  const planTypeRaw = searchParams.get("planType") ?? "";
  const pageRaw = searchParams.get("subPage") ?? "";
  const pageSizeRaw = searchParams.get("subPageSize") ?? "";
  const expiringInDaysRaw = searchParams.get("expiringInDays") ?? "";
  const fromRaw = searchParams.get("from") ?? "";
  const toRaw = searchParams.get("to") ?? "";

  return {
    page: isNumberInRange(pageRaw, 1, 100000) ?? 1,
    pageSize: isNumberInRange(pageSizeRaw, 1, 100) ?? 20,
    status: ADMIN_SUBSCRIPTION_STATUSES_NO_NONE.includes(statusRaw as Exclude<AdminSubscriptionStatus, "none">)
      ? (statusRaw as Exclude<AdminSubscriptionStatus, "none">)
      : undefined,
    planType: planTypeRaw === "pro" || planTypeRaw === "enterprise"
      ? planTypeRaw
      : undefined,
    expiringInDays: isNumberInRange(expiringInDaysRaw, 1, 365) ?? 7,
    from: fromRaw && isIsoLike(fromRaw) ? fromRaw : undefined,
    to: toRaw && isIsoLike(toRaw) ? toRaw : undefined,
  };
}

export function parseMetricsParamsFromSearch(searchParams: URLSearchParams): GetAdminMetricsParams {
  const granularityRaw = searchParams.get("granularity") ?? "day";
  const fromRaw = searchParams.get("from") ?? "";
  const toRaw = searchParams.get("to") ?? "";
  const normalizedGranularity: AdminMetricsGranularity = isAdminMetricsGranularity(granularityRaw)
    ? granularityRaw
    : "day";

  return {
    granularity: normalizedGranularity,
    from: fromRaw && isIsoLike(fromRaw) ? fromRaw : undefined,
    to: toRaw && isIsoLike(toRaw) ? toRaw : undefined,
  };
}

export function setSearchParam(searchParams: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === "") {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, String(value));
}
