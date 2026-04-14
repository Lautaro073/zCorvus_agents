"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PencilLine, RotateCcw, Trash2, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  AdminPreferenceColumnKey,
  AdminPlanType,
  AdminSubscription,
  AdminSubscriptionStatus,
  AdminUser,
  GetAdminUsersParams,
  UpdateAdminUserPayload,
} from "@/lib/api/backend";
import {
  BackendApiError,
  deleteAdminUserPermanently,
  disableAdminUser,
  reEnableAdminUser,
  updateAdminUser,
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
type PendingAction =
  | { type: "disable"; user: AdminUser }
  | { type: "delete"; user: AdminUser }
  | null;

interface EditUserDraft {
  username: string;
  email: string;
  role: "admin" | "user" | "pro";
}

const defaultVisibleColumns: Record<UserColumnKey, boolean> = {
  username: true,
  email: true,
  role: true,
  accountStatus: true,
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

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof BackendApiError && error.message) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function normalizeAccountStatus(status: AdminUser["accountStatus"] | undefined): "active" | "disabled" {
  return status === "disabled" ? "disabled" : "active";
}

function ActionIconButton({
  label,
  onClick,
  disabled,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className={
              destructive
                ? "rounded-full border-destructive/25 text-destructive hover:bg-destructive/10"
                : "rounded-full"
            }
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function EditUserModal({
  open,
  user,
  draft,
  onDraftChange,
  onClose,
  onSubmit,
  isPending,
  labels,
}: {
  open: boolean;
  user: AdminUser | null;
  draft: EditUserDraft;
  onDraftChange: (next: EditUserDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  labels: {
    title: string;
    subtitle: string;
    save: string;
    cancel: string;
    username: string;
    email: string;
    role: string;
    accountStatus: string;
    active: string;
    disabled: string;
  };
}) {
  if (!open || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="ui-surface-panel w-full max-w-xl rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="ui-section-header">{labels.title}</p>
            <h3 className="mt-2 text-2xl font-medium tracking-tight text-foreground">{user.username}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{labels.subtitle}</p>
          </div>
          <span className="inline-flex rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {labels.accountStatus}: {user.accountStatus === "disabled" ? labels.disabled : labels.active}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {labels.username}
            </label>
            <Input
              value={draft.username}
              onChange={(event) => onDraftChange({ ...draft, username: event.currentTarget.value })}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {labels.email}
            </label>
            <Input
              value={draft.email}
              onChange={(event) => onDraftChange({ ...draft, email: event.currentTarget.value })}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {labels.role}
            </label>
            <select
              value={draft.role}
              onChange={(event) => onDraftChange({ ...draft, role: event.currentTarget.value as EditUserDraft["role"] })}
              disabled={isPending}
              className="ui-focus-ring ui-field-base h-11 rounded-[1.15rem] px-4 text-sm transition-[border-color,background-color,box-shadow] duration-[160ms] ease-[var(--ease-out)]"
            >
              <option value="admin">admin</option>
              <option value="user">user</option>
              <option value="pro">pro</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={onClose} disabled={isPending}>
            {labels.cancel}
          </Button>
          <Button type="button" className="rounded-full" onClick={onSubmit} disabled={isPending}>
            {isPending ? `${labels.save}...` : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmActionModal({
  pendingAction,
  onClose,
  onConfirm,
  isPending,
  labels,
}: {
  pendingAction: PendingAction;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  labels: {
    cancel: string;
    confirmDisable: string;
    confirmDelete: string;
    disableTitle: string;
    disableBody: string;
    deleteTitle: string;
    deleteBody: string;
  };
}) {
  if (!pendingAction) {
    return null;
  }

  const isDelete = pendingAction.type === "delete";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="ui-surface-panel w-full max-w-lg rounded-[2rem] p-5 sm:p-6">
        <p className="ui-section-header">{isDelete ? labels.deleteTitle : labels.disableTitle}</p>
        <h3 className="mt-2 text-2xl font-medium tracking-tight text-foreground">{pendingAction.user.username}</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isDelete ? labels.deleteBody : labels.disableBody}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={onClose} disabled={isPending}>
            {labels.cancel}
          </Button>
          <Button
            type="button"
            variant={isDelete ? "destructive" : "default"}
            className="rounded-full"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? `${isDelete ? labels.confirmDelete : labels.confirmDisable}...`
              : isDelete
                ? labels.confirmDelete
                : labels.confirmDisable}
          </Button>
        </div>
      </div>
    </div>
  );
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
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const locale = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return "en-US";
    }
  }, []);
  const isPlanFilterEnabled = Boolean(planType);
  const shouldLoadPlans = usersParams.subscriptionStatus !== "none" || isPlanFilterEnabled;
  const isDisabledAccountsView = usersParams.accountStatus === "disabled";
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editDraft, setEditDraft] = useState<EditUserDraft>({ username: "", email: "", role: "user" });
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const columnOptions = useMemo(
    () => [
      { key: "username" as const, label: admin("table.users.username") },
      { key: "email" as const, label: admin("table.users.email") },
      { key: "role" as const, label: admin("table.users.role") },
      { key: "accountStatus" as const, label: admin("table.users.accountStatus") },
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

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateAdminUserPayload }) => updateAdminUser(userId, payload),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success(admin("toasts.userUpdated"));
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, admin("errors.updateUser")));
    },
  });

  const disableMutation = useMutation({
    mutationFn: (userId: string) => disableAdminUser(userId),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success(admin("toasts.userDisabled"));
      setPendingAction(null);
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, admin("errors.disableUser")));
    },
  });

  const reEnableMutation = useMutation({
    mutationFn: (userId: string) => reEnableAdminUser(userId),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success(admin("toasts.userReEnabled"));
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, admin("errors.reEnableUser")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUserPermanently(userId),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success(admin("toasts.userDeleted"));
      setPendingAction(null);
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, admin("errors.deleteUser")));
    },
  });

  const usersPagination = usersQuery.data?.pagination;
  const subscriptionByEmail = buildSubscriptionByEmailMap(subscriptionsQuery.data?.data);
  const planByEmail = new Map(
    Array.from(subscriptionByEmail.entries()).map(([email, subscription]) => [email, subscription.plan_type])
  );
  const usersRows = usersQuery.data?.data ?? [];
  const accountVisibleUsers = usersRows.filter((item) => {
    const accountStatus = normalizeAccountStatus(item.accountStatus);

    if (usersParams.accountStatus === "disabled") {
      return accountStatus === "disabled";
    }

    return accountStatus === "active";
  });
  const filteredUsers = isPlanFilterEnabled
    ? accountVisibleUsers.filter((item) => resolvePlanForUser(item, planByEmail) === planType)
    : accountVisibleUsers;

  const isLoading = usersQuery.state === "loading" || (isPlanFilterEnabled && subscriptionsQuery.state === "loading");
  const isError = usersQuery.state === "error" || (isPlanFilterEnabled && subscriptionsQuery.state === "error");
  const isEmpty = !isLoading && !isError && filteredUsers.length === 0;

  const formatDate = (rawDate?: string | null) => {
    if (!rawDate) {
      return "-";
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(locale);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditDraft({
      username: user.username,
      email: user.email,
      role: user.role_name,
    });
  };

  const submitEditModal = () => {
    if (!editingUser) {
      return;
    }

    const nextUsername = editDraft.username.trim();
    const nextEmail = editDraft.email.trim();
    const nextRole = editDraft.role;

    if (
      nextUsername === editingUser.username &&
      nextEmail === editingUser.email &&
      nextRole === editingUser.role_name
    ) {
      setEditingUser(null);
      return;
    }

    updateMutation.mutate({
      userId: editingUser.id,
      payload: {
        username: nextUsername,
        email: nextEmail,
        role: nextRole,
      },
    });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "disable") {
      disableMutation.mutate(pendingAction.user.id);
      return;
    }

    deleteMutation.mutate(pendingAction.user.id);
  };

  const modalLabels = {
    title: admin("dialogs.editUserTitle"),
    subtitle: admin("dialogs.editUserBody"),
    save: common("actions.update"),
    cancel: common("actions.cancel"),
    username: admin("table.users.username"),
    email: admin("table.users.email"),
    role: admin("table.users.role"),
    accountStatus: admin("table.users.accountStatus"),
    active: admin("accountStatuses.active"),
    disabled: admin("accountStatuses.disabled"),
  };

  const confirmLabels = {
    cancel: common("actions.cancel"),
    confirmDisable: admin("dialogs.confirmDisableCta"),
    confirmDelete: admin("dialogs.confirmDeleteCta"),
    disableTitle: admin("dialogs.disableTitle"),
    disableBody: admin("dialogs.disableBody"),
    deleteTitle: admin("dialogs.deleteTitle"),
    deleteBody: admin("dialogs.deleteBody"),
  };

  return (
    <TooltipProvider>
      <section className="grid gap-4 overflow-x-clip">
        <article className="ui-surface-panel flex min-h-[30rem] min-w-0 flex-col rounded-[1.85rem] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div />

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
                    <div key={rowIdx} className="grid grid-cols-9 gap-2 animate-pulse">
                      {Array.from({ length: 9 }).map((__, colIdx) => (
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
                <table className="w-full min-w-[76rem] text-left text-sm md:min-w-[72rem]">
                  <thead className="sticky top-0 z-10 border-b border-border/60 text-[11px]">
                    <tr className="border-b border-border/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {visibleColumns.username && <th className="px-3 py-3">{admin("table.users.username")}</th>}
                      {visibleColumns.email && <th className="px-3 py-3">{admin("table.users.email")}</th>}
                      {visibleColumns.role && <th className="px-3 py-3">{admin("table.users.role")}</th>}
                      {visibleColumns.accountStatus && <th className="px-3 py-3">{admin("table.users.accountStatus")}</th>}
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
                      const accountStatus = normalizeAccountStatus(item.accountStatus);
                      const isSelf = currentUser?.id === item.id;
                      const isMutatingRow =
                        updateMutation.isPending && editingUser?.id === item.id
                        || reEnableMutation.isPending && reEnableMutation.variables === item.id
                        || disableMutation.isPending && pendingAction?.type === "disable" && pendingAction.user.id === item.id
                        || deleteMutation.isPending && pendingAction?.type === "delete" && pendingAction.user.id === item.id;

                      return (
                        <tr key={item.id} className="border-b border-border/40 transition-colors duration-150 hover:bg-muted/16">
                          {visibleColumns.username && <td className="px-3 py-4 font-medium text-foreground">{item.username}</td>}
                          {visibleColumns.email && <td className="px-3 py-4 text-muted-foreground">{item.email}</td>}
                          {visibleColumns.role && <td className="px-3 py-4">{admin(`roles.${item.role_name}`)}</td>}
                          {visibleColumns.accountStatus && (
                            <td className="px-3 py-4">
                              <div className="inline-flex min-w-0 items-center gap-2">
                                <span
                                  className={`size-2 rounded-full ${
                                    accountStatus === "disabled" ? "bg-amber-300/85" : "bg-emerald-300/85"
                                  }`}
                                />
                                <span
                                  className={`text-sm ${
                                    accountStatus === "disabled" ? "text-amber-100/90" : "text-foreground/88"
                                  }`}
                                >
                                  {admin(`accountStatuses.${accountStatus}`)}
                                </span>
                              </div>
                            </td>
                          )}
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
                            <div className="flex justify-end gap-1.5">
                              {accountStatus === "active" ? (
                                <>
                                  <ActionIconButton
                                    label={`${common("actions.update")} ${item.username}`}
                                    onClick={() => openEditModal(item)}
                                    disabled={isMutatingRow}
                                  >
                                    <PencilLine className="size-3.5" />
                                  </ActionIconButton>
                                  <ActionIconButton
                                    label={isSelf ? admin("actions.selfProtected") : admin("actions.disable")}
                                    onClick={() => setPendingAction({ type: "disable", user: item })}
                                    disabled={isMutatingRow || isSelf}
                                  >
                                    <UserRoundX className="size-3.5" />
                                  </ActionIconButton>
                                </>
                              ) : (
                                <>
                                  {isDisabledAccountsView && (
                                    <ActionIconButton
                                      label={admin("actions.reEnable")}
                                      onClick={() => reEnableMutation.mutate(item.id)}
                                      disabled={isMutatingRow}
                                    >
                                      <RotateCcw className="size-3.5" />
                                    </ActionIconButton>
                                  )}
                                  <ActionIconButton
                                    label={isSelf ? admin("actions.selfProtected") : admin("actions.deletePermanent")}
                                    onClick={() => setPendingAction({ type: "delete", user: item })}
                                    disabled={isMutatingRow || isSelf}
                                    destructive
                                  >
                                    <Trash2 className="size-3.5" />
                                  </ActionIconButton>
                                </>
                              )}
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

      <EditUserModal
        open={Boolean(editingUser)}
        user={editingUser}
        draft={editDraft}
        onDraftChange={setEditDraft}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditingUser(null);
          }
        }}
        onSubmit={submitEditModal}
        isPending={updateMutation.isPending}
        labels={modalLabels}
      />

      <ConfirmActionModal
        pendingAction={pendingAction}
        onClose={() => {
          if (!disableMutation.isPending && !deleteMutation.isPending) {
            setPendingAction(null);
          }
        }}
        onConfirm={confirmPendingAction}
        isPending={disableMutation.isPending || deleteMutation.isPending}
        labels={confirmLabels}
      />
    </TooltipProvider>
  );
}
