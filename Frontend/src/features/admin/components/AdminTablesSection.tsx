"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type {
  AdminPreferenceColumnKey,
  AdminPlanType,
  AdminSubscription,
  AdminSubscriptionStatus,
  AdminUser,
  GetAdminUsersParams,
} from "@/lib/api/backend";
import { useAdminSubscriptions, useAdminUsers } from "@/features/admin";

interface AdminTablesSectionProps {
  usersParams: GetAdminUsersParams;
  planType?: AdminPlanType;
  enabled?: boolean;
  onUsersPageChange: (page: number) => void;
  visibleColumns: Record<UserColumnKey, boolean>;
  onToggleColumnVisibility: (key: UserColumnKey) => void;
}

type UserColumnKey = AdminPreferenceColumnKey;

const defaultVisibleColumns: Record<UserColumnKey, boolean> = {
  username: true,
  email: true,
  role: true,
  status: true,
  plan: true,
  startDate: true,
  tokenExpiry: true,
};

export { defaultVisibleColumns };
export type { UserColumnKey };

function buildSubscriptionByEmailMap(rows: AdminSubscription[] = []) {
  return new Map(rows.map((row) => [row.user_email, row]));
}

function mapSubscriptionStatusForPlanFilter(
  status?: AdminSubscriptionStatus
): Exclude<AdminSubscriptionStatus, "none"> | undefined {
  if (!status || status === "none") {
    return undefined;
  }

  return status;
}

function resolvePlanForUser(user: AdminUser, planByEmail: Map<string, AdminPlanType>): AdminPlanType | undefined {
  const planFromSubscription = planByEmail.get(user.email);
  if (planFromSubscription) {
    return planFromSubscription;
  }

  if (user.role_name === "pro") {
    return "pro";
  }

  return undefined;
}

export function AdminTablesSection({
  usersParams,
  planType,
  enabled = true,
  onUsersPageChange,
  visibleColumns,
  onToggleColumnVisibility,
}: AdminTablesSectionProps) {
  const admin = useTranslations("admin");
  const common = useTranslations("common");
  const locale = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return "en-US";
    }
  }, []);
  const isPlanFilterEnabled = Boolean(planType);
  const shouldLoadPlans = usersParams.subscriptionStatus !== "none" || isPlanFilterEnabled;

  const columnOptions = useMemo(
    () => [
      { key: "username" as const, label: admin("table.users.username") },
      { key: "email" as const, label: admin("table.users.email") },
      { key: "role" as const, label: admin("table.users.role") },
      { key: "status" as const, label: admin("table.users.status") },
      { key: "plan" as const, label: admin("table.subscriptions.plan") },
      { key: "startDate" as const, label: admin("table.users.startDate") },
      { key: "tokenExpiry" as const, label: admin("table.users.tokenExpiry") },
    ],
    [admin]
  );

  const visibleColumnCount = columnOptions.reduce(
    (total, option) => total + (visibleColumns[option.key] ? 1 : 0),
    0
  );

  const usersQuery = useAdminUsers(usersParams, { keepPreviousData: true, enabled });
  const subscriptionsQuery = useAdminSubscriptions(
    {
      page: 1,
      pageSize: 100,
      status: mapSubscriptionStatusForPlanFilter(usersParams.subscriptionStatus),
      planType,
      expiringInDays: usersParams.expiringInDays ?? 7,
    },
    { enabled: enabled && shouldLoadPlans }
  );

  const usersPagination = usersQuery.data?.pagination;
  const subscriptionByEmail = buildSubscriptionByEmailMap(subscriptionsQuery.data?.data);
  const planByEmail = new Map(
    Array.from(subscriptionByEmail.entries()).map(([email, subscription]) => [email, subscription.plan_type])
  );
  const usersRows = usersQuery.data?.data ?? [];
  const filteredUsers = isPlanFilterEnabled
    ? usersRows.filter((item) => resolvePlanForUser(item, planByEmail) === planType)
    : usersRows;

  const isLoading = usersQuery.state === "loading" || (isPlanFilterEnabled && subscriptionsQuery.state === "loading");
  const isError = usersQuery.state === "error" || (isPlanFilterEnabled && subscriptionsQuery.state === "error");
  const isEmpty = !isLoading && !isError && filteredUsers.length === 0;

  const formatDate = (rawDate?: string) => {
    if (!rawDate) {
      return "-";
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(locale);
  };

  return (
    <section className="grid gap-4 overflow-x-clip">
      <article className="ui-surface-panel flex min-h-[30rem] min-w-0 flex-col rounded-[1.85rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="ui-section-header">{admin("table.users.title")}</p>
            <h2 className="mt-2 text-xl tracking-tight text-foreground">Usuarios</h2>
          </div>

          {!isLoading && !isError && !isEmpty && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  {admin("table.users.columnsControl")}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 rounded-[1.4rem] p-3">
                <div className="grid gap-2">
                  {columnOptions.map((columnOption) => (
                    <label key={columnOption.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={visibleColumns[columnOption.key]}
                        onChange={() => onToggleColumnVisibility(columnOption.key)}
                        disabled={visibleColumnCount === 1 && visibleColumns[columnOption.key]}
                      />
                      <span>{columnOption.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="mt-4 min-h-[20rem] min-w-0">
          {isLoading && (
            <div className="overflow-x-auto overscroll-x-contain">
              <div className="min-w-[56rem] space-y-2 md:min-w-[52rem]">
                {Array.from({ length: 6 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-8 gap-2 animate-pulse">
                    {Array.from({ length: 8 }).map((__, colIdx) => (
                      <div key={`${rowIdx}-${colIdx}`} className="h-10 rounded-[1rem] bg-muted/75" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {isError && (
            <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">
                {isPlanFilterEnabled ? admin("errors.loadSubscriptions") : admin("errors.loadUsers")}
              </p>
            </div>
          )}
          {isEmpty && (
            <div className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{admin("states.emptyUsers")}</p>
            </div>
          )}

          {!isLoading && !isError && !isEmpty && (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[68rem] text-left text-sm md:min-w-[64rem]">
                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                  <tr className="border-b border-border/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {visibleColumns.username && <th className="px-3 py-3">{admin("table.users.username")}</th>}
                    {visibleColumns.email && <th className="px-3 py-3">{admin("table.users.email")}</th>}
                    {visibleColumns.role && <th className="px-3 py-3">{admin("table.users.role")}</th>}
                    {visibleColumns.status && <th className="px-3 py-3">{admin("table.users.status")}</th>}
                    {visibleColumns.plan && <th className="px-3 py-3">{admin("table.subscriptions.plan")}</th>}
                    {visibleColumns.startDate && <th className="px-3 py-3">{admin("table.users.startDate")}</th>}
                    {visibleColumns.tokenExpiry && <th className="px-3 py-3">{admin("table.users.tokenExpiry")}</th>}
                    <th className="px-3 py-3 text-right">{admin("table.users.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const subscription = subscriptionByEmail.get(item.email);
                    const resolvedPlan = resolvePlanForUser(item, planByEmail);
                    const subscriptionStartDate = subscription?.start_date;
                    const subscriptionFinishDate = item.token_finish_date ?? subscription?.finish_date;

                    return (
                      <tr key={item.id} className="border-b border-border/40 transition-colors duration-150 hover:bg-muted/16">
                        {visibleColumns.username && <td className="px-3 py-4 font-medium text-foreground">{item.username}</td>}
                        {visibleColumns.email && <td className="px-3 py-4 text-muted-foreground">{item.email}</td>}
                        {visibleColumns.role && <td className="px-3 py-4">{admin(`roles.${item.role_name}`)}</td>}
                        {visibleColumns.status && <td className="px-3 py-4">{admin(`statuses.${item.subscriptionStatus}`)}</td>}
                        {visibleColumns.plan && (
                          <td className="px-3 py-4">
                            <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">
                              {resolvedPlan ?? "-"}
                            </span>
                          </td>
                        )}
                        {visibleColumns.startDate && (
                          <td className="px-3 py-4 text-muted-foreground">{formatDate(subscriptionStartDate)}</td>
                        )}
                        {visibleColumns.tokenExpiry && <td className="px-3 py-4 text-muted-foreground">{formatDate(subscriptionFinishDate)}</td>}
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="rounded-full"
                              aria-label={`${common("actions.update")} ${item.username}`}
                            >
                              {common("actions.update")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="rounded-full"
                              aria-label={`${common("actions.softDelete")} ${item.username}`}
                            >
                              {common("actions.softDelete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {usersPagination && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {usersPagination.page} / {usersPagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!usersPagination.hasPrev}
                onClick={() => onUsersPageChange(Math.max(1, usersPagination.page - 1))}
                className="rounded-full"
              >
                {common("actions.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!usersPagination.hasNext}
                onClick={() => onUsersPageChange(usersPagination.page + 1)}
                className="rounded-full"
              >
                {common("actions.next")}
              </Button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
