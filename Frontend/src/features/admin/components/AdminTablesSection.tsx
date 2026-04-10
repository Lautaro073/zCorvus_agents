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

  return (
    <section className="grid gap-4 overflow-x-clip">
      <article className="flex min-h-[30rem] min-w-0 flex-col rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
        <h2 className="text-lg">{admin("table.users.title")}</h2>

        <div className="mt-4 min-h-[20rem] min-w-0">
          {isLoading && (
            <div className="overflow-x-auto overscroll-x-contain">
              <div className="min-w-[56rem] space-y-2 md:min-w-[52rem]">
                {Array.from({ length: 6 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((__, colIdx) => (
                      <div key={`${rowIdx}-${colIdx}`} className="h-8 rounded-md bg-muted/70" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">
              {isPlanFilterEnabled ? admin("errors.loadSubscriptions") : admin("errors.loadUsers")}
            </p>
          )}
          {isEmpty && <p className="text-sm text-muted-foreground">{admin("states.emptyUsers")}</p>}

          {!isLoading && !isError && !isEmpty && (
            <div className="overflow-x-auto overscroll-x-contain">
              <div className="mb-3 flex justify-end">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {admin("table.users.columnsControl")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-3">
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
              </div>

              <table className="w-full min-w-[56rem] text-left text-sm md:min-w-[52rem]">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {visibleColumns.username && <th className="px-2 py-3">{admin("table.users.username")}</th>}
                    {visibleColumns.email && <th className="px-2 py-3">{admin("table.users.email")}</th>}
                    {visibleColumns.role && <th className="px-2 py-3">{admin("table.users.role")}</th>}
                    {visibleColumns.status && <th className="px-2 py-3">{admin("table.users.status")}</th>}
                    {visibleColumns.plan && <th className="px-2 py-3">{admin("table.subscriptions.plan")}</th>}
                    {visibleColumns.startDate && <th className="px-2 py-3">{admin("table.users.startDate")}</th>}
                    {visibleColumns.tokenExpiry && <th className="px-2 py-3">{admin("table.users.tokenExpiry")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const subscription = subscriptionByEmail.get(item.email);
                    const resolvedPlan = resolvePlanForUser(item, planByEmail);
                    const subscriptionStartDate = subscription?.start_date;
                    const subscriptionFinishDate = item.token_finish_date ?? subscription?.finish_date;

                    return (
                      <tr key={item.id} className="border-b border-border/40">
                        {visibleColumns.username && <td className="px-2 py-3">{item.username}</td>}
                        {visibleColumns.email && <td className="px-2 py-3">{item.email}</td>}
                        {visibleColumns.role && <td className="px-2 py-3">{admin(`roles.${item.role_name}`)}</td>}
                        {visibleColumns.status && <td className="px-2 py-3">{admin(`statuses.${item.subscriptionStatus}`)}</td>}
                        {visibleColumns.plan && <td className="px-2 py-3 uppercase">{resolvedPlan ?? "-"}</td>}
                        {visibleColumns.startDate && (
                          <td className="px-2 py-3">
                            {subscriptionStartDate ? new Date(subscriptionStartDate).toLocaleDateString() : "-"}
                          </td>
                        )}
                        {visibleColumns.tokenExpiry && (
                          <td className="px-2 py-3">
                            {subscriptionFinishDate ? new Date(subscriptionFinishDate).toLocaleDateString() : "-"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {usersPagination && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {usersPagination.page} / {usersPagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!usersPagination.hasPrev}
                onClick={() => onUsersPageChange(Math.max(1, usersPagination.page - 1))}
              >
                {common("actions.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!usersPagination.hasNext}
                onClick={() => onUsersPageChange(usersPagination.page + 1)}
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
