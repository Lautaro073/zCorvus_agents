"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  defaultVisibleColumns,
  type UserColumnKey,
  AdminAppearanceControls,
  KPICards,
  MetricsCharts,
  setSearchParam,
  parseUsersParamsFromSearch,
  parseMetricsParamsFromSearch,
  useAdminPreferences,
  useAdminMetrics,
} from "@/features/admin";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/contexts/AuthContext";

const AdminTablesSection = dynamic(
  () => import("@/features/admin/components/AdminTablesSection").then((module) => module.AdminTablesSection),
  { ssr: false }
);

const metricGranularityOptions = ["day", "month", "year", "custom"] as const;

function PlaceholderBlock({ className }: { className?: string }) {
  return <div className={`rounded-md bg-muted/70 ${className ?? ""}`} />;
}

function AdminTablesSectionFallback({ admin }: { admin: (key: string) => string }) {
  return (
    <section className="grid gap-4" style={{ contentVisibility: "auto", containIntrinsicSize: "620px" }}>
      <article className="flex min-h-[30rem] flex-col rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
        <h2 className="text-lg">{admin("table.users.title")}</h2>
        <div className="mt-4 min-h-[20rem]">
          <PlaceholderBlock className="h-64 w-full" />
        </div>
      </article>
    </section>
  );
}

function MetricsSectionPlaceholder() {
  return (
    <div className="grid gap-2" role="status" aria-live="polite" aria-label="loading-metrics-chart">
      <div className="h-6 w-48 rounded-md bg-muted/70" />
      {Array.from({ length: 3 }).map((_, idx) => (
        <PlaceholderBlock key={idx} className="h-10 w-full rounded-lg" />
      ))}
      <PlaceholderBlock className="mt-2 h-56 w-full rounded-xl" />
    </div>
  );
}

function parseIsoToDate(rawIso?: string): Date | undefined {
  if (!rawIso) {
    return undefined;
  }

  const date = new Date(rawIso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toUtcRangeStart(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  ).toISOString();
}

function toUtcRangeEnd(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  ).toISOString();
}

function parseInputDateValue(rawValue: string): Date | undefined {
  if (!rawValue) {
    return undefined;
  }

  const [yearPart, monthPart, dayPart] = rawValue.split("-").map(Number);
  if (!yearPart || !monthPart || !dayPart) {
    return undefined;
  }

  const parsedDate = new Date(yearPart, monthPart - 1, dayPart);
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate;
}

function toInputDateValue(date?: Date): string {
  if (!date) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDateToMax(date: Date, maxDate: Date): Date {
  return date > maxDate ? maxDate : date;
}

function normalizeRangeWithMax(range: DateRange | undefined, maxDate: Date): DateRange | undefined {
  if (!range?.from) {
    return undefined;
  }

  const fromDate = clampDateToMax(range.from, maxDate);
  const toDate = clampDateToMax(range.to ?? range.from, maxDate);

  if (fromDate <= toDate) {
    return { from: fromDate, to: toDate };
  }

  return { from: toDate, to: fromDate };
}

export default function AdminDashboardPage() {
  const admin = useTranslations("admin");
  const common = useTranslations("common");
  const router = useRouter();
  const { currentLocale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();

  const usersParams = useMemo(() => parseUsersParamsFromSearch(searchParams), [searchParams]);
  const metricsParams = useMemo(() => parseMetricsParamsFromSearch(searchParams), [searchParams]);
  const selectedPlanType = useMemo(() => {
    const rawPlanType = searchParams.get("planType");
    return rawPlanType === "pro" || rawPlanType === "enterprise"
      ? (rawPlanType as "pro" | "enterprise")
      : undefined;
  }, [searchParams]);

  const [detailsEnabled, setDetailsEnabled] = useState(false);
  const [isRangePopoverOpen, setIsRangePopoverOpen] = useState(false);
  const [customRangeDraft, setCustomRangeDraft] = useState<DateRange | undefined>(undefined);
  const [optimisticVisibleColumns, setOptimisticVisibleColumns] = useState<Record<UserColumnKey, boolean> | null>(null);
  const searchDebounceRef = useRef<number | undefined>(undefined);
  const maxSelectableDate = useMemo(() => startOfLocalDay(), []);
  const maxSelectableDateInput = useMemo(
    () => toInputDateValue(maxSelectableDate),
    [maxSelectableDate]
  );
  const canLoadAdminData = detailsEnabled && !authLoading && isAuthenticated && user?.role_name === "admin";
  const preferencesQuery = useAdminPreferences({ enabled: canLoadAdminData });

  const persistedVisibleColumns = useMemo<Record<UserColumnKey, boolean>>(() => {
    const incomingVisibility = preferencesQuery.data?.data.columnVisibility;
    if (!incomingVisibility) {
      return defaultVisibleColumns;
    }

    const allowedKeys = Object.keys(defaultVisibleColumns) as UserColumnKey[];
    const normalized = allowedKeys.reduce<Record<UserColumnKey, boolean>>((acc, key) => {
      acc[key] = incomingVisibility[key] ?? defaultVisibleColumns[key];
      return acc;
    }, { ...defaultVisibleColumns });

    if (!Object.values(normalized).some(Boolean)) {
      return defaultVisibleColumns;
    }

    return normalized;
  }, [preferencesQuery.data]);

  const visibleColumns = optimisticVisibleColumns ?? persistedVisibleColumns;

  const customRangeValue = useMemo<DateRange | undefined>(() => {
    if (metricsParams.granularity !== "custom") {
      return undefined;
    }

    const from = parseIsoToDate(metricsParams.from);
    if (!from) {
      return undefined;
    }

    return {
      from,
      to: parseIsoToDate(metricsParams.to) ?? from,
    };
  }, [metricsParams.from, metricsParams.granularity, metricsParams.to]);

  const activeRangeForLabel = isRangePopoverOpen
    ? (customRangeDraft ?? customRangeValue)
    : customRangeValue;

  const customRangeLabel = useMemo(() => {
    const fallbackLabel = `${admin("filters.from")} - ${admin("filters.to")}`;
    if (!activeRangeForLabel?.from) {
      return fallbackLabel;
    }

    const formatter = new Intl.DateTimeFormat(currentLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const fromLabel = formatter.format(activeRangeForLabel.from);
    const toLabel = formatter.format(activeRangeForLabel.to ?? activeRangeForLabel.from);
    return `${fromLabel} - ${toLabel}`;
  }, [activeRangeForLabel, admin, currentLocale]);

  useEffect(() => {
    if (detailsEnabled) {
      return;
    }

    const enableDetails = () => setDetailsEnabled(true);
    const timerId = window.setTimeout(enableDetails, 3200);

    window.addEventListener("touchstart", enableDetails, { once: true, passive: true });
    window.addEventListener("pointerdown", enableDetails, { once: true, passive: true });
    window.addEventListener("keydown", enableDetails, { once: true });
    window.addEventListener("focusin", enableDetails, { once: true });
    window.addEventListener("wheel", enableDetails, { once: true, passive: true });

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("touchstart", enableDetails);
      window.removeEventListener("pointerdown", enableDetails);
      window.removeEventListener("keydown", enableDetails);
      window.removeEventListener("focusin", enableDetails);
      window.removeEventListener("wheel", enableDetails);
    };
  }, [detailsEnabled]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/login?session=expired");
      return;
    }

    if (user?.role_name && user.role_name !== "admin") {
      router.replace("/icons");
    }
  }, [authLoading, isAuthenticated, router, user?.role_name]);

  const metricsQuery = useAdminMetrics(metricsParams, { enabled: canLoadAdminData });

  const updateUrl = useCallback(
    (
      updater: (params: URLSearchParams) => void,
      options?: { history?: "push" | "replace" }
    ) => {
      const next = new URLSearchParams(searchParams.toString());
      updater(next);

      const queryString = next.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (options?.history === "push") {
        window.history.pushState(null, "", nextUrl);
      } else {
        window.history.replaceState(null, "", nextUrl);
      }
    },
    [pathname, searchParams]
  );

  const onGranularityChange = (granularity: string) => {
    updateUrl((params) => {
      setSearchParam(params, "granularity", granularity);
      if (granularity === "custom") {
        const hasFrom = Boolean(params.get("from"));
        const hasTo = Boolean(params.get("to"));
        if (!hasFrom || !hasTo) {
          const today = new Date();
          setSearchParam(params, "from", toUtcRangeStart(today));
          setSearchParam(params, "to", toUtcRangeEnd(today));
        }
      } else {
        params.delete("from");
        params.delete("to");
      }
    });
  };

  const onCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRangeDraft(normalizeRangeWithMax(range, maxSelectableDate));
  };

  const onCustomRangeInputChange = (field: "from" | "to", rawValue: string) => {
    const parsedDate = parseInputDateValue(rawValue);
    const normalizedDate = parsedDate
      ? clampDateToMax(parsedDate, maxSelectableDate)
      : undefined;

    setCustomRangeDraft((currentDraft) => {
      const baseRange = currentDraft ?? customRangeValue;
      const baseFrom = baseRange?.from;
      const baseTo = baseRange?.to ?? baseRange?.from;

      if (field === "from") {
        if (!normalizedDate) {
          return baseTo ? { from: baseTo, to: baseTo } : undefined;
        }

        if (!baseTo) {
          return { from: normalizedDate, to: normalizedDate };
        }

        if (normalizedDate <= baseTo) {
          return { from: normalizedDate, to: baseTo };
        }

        return { from: normalizedDate, to: normalizedDate };
      }

      if (!normalizedDate) {
        return baseFrom ? { from: baseFrom, to: baseFrom } : undefined;
      }

      if (!baseFrom) {
        return { from: normalizedDate, to: normalizedDate };
      }

      if (normalizedDate >= baseFrom) {
        return { from: baseFrom, to: normalizedDate };
      }

      return { from: normalizedDate, to: baseFrom };
    });
  };

  const onRangePopoverOpenChange = useCallback((open: boolean) => {
    setIsRangePopoverOpen(open);

    if (open) {
      setCustomRangeDraft(normalizeRangeWithMax(customRangeValue, maxSelectableDate));
      return;
    }

    setCustomRangeDraft(normalizeRangeWithMax(customRangeValue, maxSelectableDate));
  }, [customRangeValue, maxSelectableDate]);

  const cancelCustomRangeDraft = useCallback(() => {
    setCustomRangeDraft(normalizeRangeWithMax(customRangeValue, maxSelectableDate));
    setIsRangePopoverOpen(false);
  }, [customRangeValue, maxSelectableDate]);

  const applyCustomRangeDraft = useCallback(() => {
    const normalizedDraft = normalizeRangeWithMax(customRangeDraft, maxSelectableDate);

    if (metricsParams.granularity !== "custom" || !normalizedDraft?.from) {
      setIsRangePopoverOpen(false);
      return;
    }

    const nextFrom = toUtcRangeStart(normalizedDraft.from);
    const nextTo = toUtcRangeEnd(normalizedDraft.to ?? normalizedDraft.from);

    if (metricsParams.from === nextFrom && metricsParams.to === nextTo) {
      setIsRangePopoverOpen(false);
      return;
    }

    updateUrl((params) => {
      setSearchParam(params, "from", nextFrom);
      setSearchParam(params, "to", nextTo);
    });

    setIsRangePopoverOpen(false);
  }, [customRangeDraft, maxSelectableDate, metricsParams.from, metricsParams.granularity, metricsParams.to, updateUrl]);

  const applySearch = useCallback((value: string) => {
    const trimmedValue = value.trim();
    const nextSearch = trimmedValue || undefined;

    if ((usersParams.search ?? undefined) === nextSearch) {
      return;
    }

    updateUrl((params) => {
      setSearchParam(params, "search", nextSearch);
      setSearchParam(params, "usersPage", 1);
    });
  }, [updateUrl, usersParams.search]);

  const onSearchInputChange = useCallback((value: string) => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    const trimmedValue = value.trim();
    const valueToApply = trimmedValue.length >= 3 ? trimmedValue : "";

    searchDebounceRef.current = window.setTimeout(() => {
      applySearch(valueToApply);
    }, 250);
  }, [applySearch]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const onToggleColumnVisibility = useCallback((key: UserColumnKey) => {
    if (!canLoadAdminData) {
      return;
    }

    const currentVisibleCount = Object.values(visibleColumns).filter(Boolean).length;
    if (visibleColumns[key] && currentVisibleCount === 1) {
      return;
    }

    const next = {
      ...visibleColumns,
      [key]: !visibleColumns[key],
    };

    setOptimisticVisibleColumns(next);
    void preferencesQuery
      .savePreferences({
        columnVisibility: {
          [key]: next[key],
        },
      })
      .catch(() => {
        setOptimisticVisibleColumns(null);
      });
  }, [canLoadAdminData, preferencesQuery, visibleColumns]);

  const kpiCards = [
    { key: "registrations", value: metricsQuery.data?.data.kpis.registrations ?? null },
    { key: "salesCount", value: metricsQuery.data?.data.kpis.salesCount ?? null },
    { key: "revenue", value: metricsQuery.data?.data.kpis.grossRevenue ?? null },
  ];

  return (
    <div className="flex flex-col gap-6 pb-4">
      <section className="rounded-[2rem] border border-border/70 bg-secondary/35 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="ui-section-header">ADMIN</p>
          <AdminAppearanceControls />
        </div>
        <h1 className="mt-2 text-[clamp(2rem,4vw,2.8rem)] leading-tight">{admin("title")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{admin("description")}</p>

        <KPICards
          items={kpiCards.map((metric) => ({
            key: metric.key,
            label: admin(`kpis.${metric.key}`),
            value: metric.value,
            isCurrency: metric.key === "revenue",
          }))}
        />
      </section>
      
      <section
        className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4"
        style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}
      >
        <h2 className="text-lg">{admin("kpis.salesCount")} / {admin("kpis.revenue")}</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select
            value={metricsParams.granularity ?? "day"}
            onChange={(event) => onGranularityChange(event.target.value)}
            className="ui-focus-ring ui-field-base h-9 rounded-md px-3 text-sm"
            aria-label={admin("filters.granularity")}
          >
            {metricGranularityOptions.map((option) => (
              <option key={option} value={option}>{admin(`filters.${option}`)}</option>
            ))}
          </select>

          {metricsParams.granularity === "custom" && (
            <Popover open={isRangePopoverOpen} onOpenChange={onRangePopoverOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                  aria-label={`${admin("filters.from")} - ${admin("filters.to")}`}
                >
                  {customRangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-fit p-0" align="start">
                <div className="grid gap-2 border-b border-border/40 p-3">
                  <Input
                    type="date"
                    aria-label={admin("filters.from")}
                    value={toInputDateValue((customRangeDraft ?? customRangeValue)?.from)}
                    onChange={(event) => onCustomRangeInputChange("from", event.currentTarget.value)}
                    max={maxSelectableDateInput}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="date"
                    aria-label={admin("filters.to")}
                    value={toInputDateValue((customRangeDraft ?? customRangeValue)?.to ?? (customRangeDraft ?? customRangeValue)?.from)}
                    onChange={(event) => onCustomRangeInputChange("to", event.currentTarget.value)}
                    max={maxSelectableDateInput}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex justify-center">
                  <Calendar
                    mode="range"
                    selected={customRangeDraft ?? customRangeValue}
                    onSelect={onCustomRangeChange}
                    numberOfMonths={1}
                    disabled={{ after: maxSelectableDate }}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-border/40 p-3">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelCustomRangeDraft}>
                    {common("actions.cancel")}
                  </Button>
                  <Button type="button" size="sm" onClick={applyCustomRangeDraft}>
                    {common("actions.apply")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="mt-4 min-h-[22rem] min-w-0 overflow-x-clip">
          {!detailsEnabled && <MetricsSectionPlaceholder />}
          {detailsEnabled && metricsQuery.state === "loading" && <PlaceholderBlock className="h-72 w-full" />}
          {detailsEnabled && metricsQuery.state === "error" && <p className="text-sm text-destructive">{admin("errors.loadMetrics")}</p>}
          {detailsEnabled && metricsQuery.state === "empty" && <p className="text-sm text-muted-foreground">{admin("states.emptyMetrics")}</p>}

          {detailsEnabled && metricsQuery.state === "success" && (
            <MetricsCharts points={metricsQuery.data?.data.timeseries ?? []} />
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-background/80 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            key={usersParams.search ?? "__empty__"}
            placeholder={admin("filters.search")}
            defaultValue={usersParams.search ?? ""}
            onChange={(event) => onSearchInputChange(event.currentTarget.value)}
          />

          <select
            value={usersParams.role ?? ""}
            onChange={(event) => updateUrl((params) => {
              setSearchParam(params, "role", event.target.value || undefined);
              setSearchParam(params, "usersPage", 1);
            })}
            className="ui-focus-ring ui-field-base h-9 rounded-md px-3 text-sm"
            aria-label={admin("filters.role")}
          >
            <option value="">{admin("filters.role")}</option>
            <option value="admin">{admin("roles.admin")}</option>
            <option value="user">{admin("roles.user")}</option>
            <option value="pro">{admin("roles.pro")}</option>
          </select>

          <select
            value={usersParams.subscriptionStatus ?? ""}
            onChange={(event) => updateUrl((params) => {
              setSearchParam(params, "subscriptionStatus", event.target.value || undefined);
              setSearchParam(params, "usersPage", 1);
            })}
            className="ui-focus-ring ui-field-base h-9 rounded-md px-3 text-sm"
            aria-label={admin("filters.subscriptionStatus")}
          >
            <option value="">{admin("filters.subscriptionStatus")}</option>
            <option value="active">{admin("statuses.active")}</option>
            <option value="expiring">{admin("statuses.expiring")}</option>
            <option value="expired">{admin("statuses.expired")}</option>
              <option value="none">{admin("statuses.none")}</option>
          </select>

          <select
            value={searchParams.get("planType") ?? ""}
            onChange={(event) =>
              updateUrl((params) => {
                setSearchParam(params, "planType", event.target.value || undefined);
                setSearchParam(params, "usersPage", 1);
              })
            }
            className="ui-focus-ring ui-field-base h-9 rounded-md px-3 text-sm"
            aria-label={admin("filters.planType")}
          >
            <option value="">{admin("filters.planType")}</option>
            <option value="pro">PRO</option>
            <option value="enterprise">ENTERPRISE</option>
          </select>

        </div>
      </section>

      {detailsEnabled ? (
        <div className="overflow-x-clip" style={{ containIntrinsicSize: "1200px" }}>
          <AdminTablesSection
            usersParams={usersParams}
            planType={selectedPlanType}
            enabled={canLoadAdminData}
            visibleColumns={visibleColumns}
            onToggleColumnVisibility={onToggleColumnVisibility}
            onUsersPageChange={(page) =>
              updateUrl(
                (params) => setSearchParam(params, "usersPage", Math.max(1, page)),
                { history: "push" }
              )
            }
          />
        </div>
      ) : (
        <AdminTablesSectionFallback admin={admin} />
      )}
    </div>
  );
}
