"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { AdminScoringResult } from "@/lib/scoring-admin-service";
import type {
  AdminActivityRow,
  AdminUserRow,
} from "@/lib/admin-service";
import { cn } from "@/lib/cn";
import { photoProxyUrl } from "@/lib/blob-storage";
import { formatDisplayDate } from "@/lib/dates";
import { formatDistanceKm } from "@/lib/distance";
import { DEFAULT_PARTICIPANT_PASSWORD } from "@/lib/default-password";
import type { UserStanding } from "@/lib/standings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChallengeDayOption = {
  date: string;
  weekNo: number;
  targetSteps: number;
};

type AdminPanelProps = {
  initialActivities: AdminActivityRow[];
  users: AdminUserRow[];
  challengeDays: ChallengeDayOption[];
  currentAdminId: string;
  initialScoring: AdminScoringResult;
};

type AdminTab = "review" | "approved" | "participants" | "scoring";

const ADMIN_TABS: AdminTab[] = ["review", "approved", "participants", "scoring"];
const VISIBLE_TABS = 2;

const adminTabTriggerClass =
  "shrink-0 rounded-lg px-2 py-2.5 text-sm font-medium sm:px-3";

function getAdminTabLabel(
  tab: AdminTab,
  reviewCount: number,
  approvedCount: number,
): string {
  if (tab === "review") {
    return `Review${reviewCount > 0 ? ` (${reviewCount})` : ""}`;
  }
  if (tab === "approved") {
    return `Approved${approvedCount > 0 ? ` (${approvedCount})` : ""}`;
  }
  if (tab === "participants") {
    return "Participants";
  }
  return "Scoring";
}

function promoteTabToVisibleEnd(
  order: AdminTab[],
  tab: AdminTab,
  visibleCount: number,
): AdminTab[] {
  const rest = order.filter((entry) => entry !== tab);
  return [...rest.slice(0, visibleCount - 1), tab, ...rest.slice(visibleCount - 1)];
}

function AdminTabOverflowMenu({
  tabs,
  activeTab,
  getLabel,
  open,
  onOpenChange,
  onSelect,
}: {
  tabs: AdminTab[];
  activeTab: AdminTab;
  getLabel: (tab: AdminTab) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tab: AdminTab) => void;
}) {
  const activeInOverflow = tabs.includes(activeTab);

  return (
    <div className="relative mb-0.5 shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          activeInOverflow
            ? "bg-brand/10 font-semibold text-brand"
            : "text-muted hover:bg-brand/5 hover:text-foreground",
        )}
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        More
        <ChevronDownIcon className={cn("size-4 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-20"
            onClick={() => onOpenChange(false)}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-black/10 bg-surface py-1 shadow-lg ring-1 ring-black/5"
            role="menu"
          >
            {tabs.map((tab) => (
              <button
                className={cn(
                  "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-brand/5",
                  activeTab === tab
                    ? "bg-brand/10 font-semibold text-brand"
                    : "text-foreground",
                )}
                key={tab}
                onClick={() => onSelect(tab)}
                role="menuitem"
                type="button"
              >
                {getLabel(tab)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AdminPanel({
  initialActivities,
  users,
  challengeDays,
  currentAdminId,
  initialScoring,
}: AdminPanelProps) {
  const router = useRouter();
  const [adminTab, setAdminTab] = useState<AdminTab>("review");
  const [activities, setActivities] = useState(initialActivities);
  const [participantRows, setParticipantRows] = useState(users);
  const [scoring, setScoring] = useState(initialScoring);
  const [scoringDateInput, setScoringDateInput] = useState(
    initialScoring.state.scoringAsOfDate ?? initialScoring.state.effectiveDate,
  );
  const [scoringBusy, setScoringBusy] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mobileTabOrder, setMobileTabOrder] = useState<AdminTab[]>(ADMIN_TABS);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);

  const reviewCount = useMemo(
    () =>
      activities.filter(
        (row) => row.status === "pending" || row.status === "disapproved",
      ).length,
    [activities],
  );

  const approvedCount = useMemo(
    () => activities.filter((row) => row.status === "approved").length,
    [activities],
  );

  const hasActiveFilters = Boolean(userFilter || dateFilter);
  const isActivitiesTab = adminTab === "review" || adminTab === "approved";

  const filteredActivities = useMemo(() => {
    return activities.filter((row) => {
      if (userFilter && row.userId !== userFilter) return false;
      if (dateFilter && row.activityDate !== dateFilter) return false;
      if (adminTab === "review") {
        return row.status === "pending" || row.status === "disapproved";
      }
      if (adminTab === "approved") {
        return row.status === "approved";
      }
      return false;
    });
  }, [activities, userFilter, dateFilter, adminTab]);

  const visibleTabs = mobileTabOrder.slice(0, VISIBLE_TABS);
  const overflowTabs = mobileTabOrder.slice(VISIBLE_TABS);

  useEffect(() => {
    setMobileTabOrder((current) => {
      const visible = current.slice(0, VISIBLE_TABS);
      if (visible.includes(adminTab)) {
        return current;
      }
      return promoteTabToVisibleEnd(current, adminTab, VISIBLE_TABS);
    });
  }, [adminTab]);

  function selectAdminTab(tab: AdminTab) {
    setAdminTab(tab);
    setFiltersOpen(false);
    setOverflowMenuOpen(false);

    if (!visibleTabs.includes(tab)) {
      setMobileTabOrder((current) =>
        promoteTabToVisibleEnd(current, tab, VISIBLE_TABS),
      );
    }
  }

  async function refreshActivities() {
    const params = new URLSearchParams();
    if (userFilter) params.set("userId", userFilter);
    if (dateFilter) params.set("date", dateFilter);

    const response = await fetch(`/api/admin/activities?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as { activities: AdminActivityRow[] };
      setActivities(payload.activities);
    }
  }

  async function patchActivity(
    id: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    setBusyId(id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      error?: string;
      pointsDelta?: number;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Update failed.");
      return;
    }

    const delta =
      typeof payload.pointsDelta === "number" && payload.pointsDelta !== 0
        ? ` (${payload.pointsDelta > 0 ? "+" : ""}${payload.pointsDelta} pts)`
        : "";

    setMessage(`${successMessage}${delta}`);
    await refreshActivities();
    router.refresh();
  }

  async function toggleRole(user: AdminUserRow) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setBusyId(user.id);
    setError(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not update role.");
      return;
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        rows.map((row) => (row.id === payload.user!.id ? payload.user! : row)),
      );
      setMessage(
        `${payload.user.name} is now ${payload.user.role === "admin" ? "an admin" : "a participant"}.`,
      );
    }
  }

  async function deleteParticipant(user: AdminUserRow) {
    setBusyId(user.id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as {
      error?: string;
      deletedUserName?: string;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not delete participant.");
      return;
    }

    setParticipantRows((rows) => rows.filter((row) => row.id !== user.id));
    setActivities((rows) => rows.filter((row) => row.userId !== user.id));
    setMessage(`${payload.deletedUserName ?? user.name} was deleted.`);
    router.refresh();
  }

  async function runScoring(body: Record<string, unknown>, successMessage: string) {
    setScoringBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/scoring/recompute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as AdminScoringResult & {
      error?: string;
    };

    setScoringBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Scoring run failed.");
      return;
    }

    setScoring(payload);
    setScoringDateInput(
      payload.state.scoringAsOfDate ?? payload.state.effectiveDate,
    );
    setMessage(successMessage);
    router.refresh();
  }

  async function createParticipant(name: string, mobile: string) {
    setBusyId("add-participant");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile }),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not add participant.");
      return;
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        [...rows, payload.user!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setMessage(
        `${payload.user.name} added. Default password: ${DEFAULT_PARTICIPANT_PASSWORD}`,
      );
    }

    setAddParticipantOpen(false);
    router.refresh();
  }

  async function resetParticipantPassword(user: AdminUserRow) {
    setBusyId(user.id);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/admin/users/${user.id}/reset-password`,
      { method: "POST" },
    );

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not reset password.");
      return;
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        rows.map((row) => (row.id === payload.user!.id ? payload.user! : row)),
      );
      setMessage(`${payload.user.name}'s password was reset to ${DEFAULT_PARTICIPANT_PASSWORD}.`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 border-b border-black/10">
        <Tabs
          className="min-w-0 flex-1 gap-0"
          onValueChange={(value) => selectAdminTab(value as AdminTab)}
          value={adminTab}
        >
          <TabsList
            className="h-auto w-full justify-start gap-0 border-0 bg-transparent p-0 sm:gap-1"
            variant="line"
          >
            {visibleTabs.map((tab) => (
              <TabsTrigger className={adminTabTriggerClass} key={tab} value={tab}>
                {getAdminTabLabel(tab, reviewCount, approvedCount)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {overflowTabs.length > 0 ? (
          <AdminTabOverflowMenu
            activeTab={adminTab}
            getLabel={(tab) => getAdminTabLabel(tab, reviewCount, approvedCount)}
            onOpenChange={setOverflowMenuOpen}
            onSelect={selectAdminTab}
            open={overflowMenuOpen}
            tabs={overflowTabs}
          />
        ) : null}

        {isActivitiesTab ? (
          <button
            aria-expanded={filtersOpen}
            aria-label="Open activity filters"
            className={cn(
              "mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              hasActiveFilters
                ? "text-brand"
                : "text-muted hover:bg-brand/5 hover:text-foreground",
            )}
            onClick={() => setFiltersOpen(true)}
            type="button"
          >
            <FilterIcon className="size-4" />
            Filter
            {hasActiveFilters ? (
              <span className="size-1.5 rounded-full bg-brand" />
            ) : null}
          </button>
        ) : null}
      </div>

      <BottomFilterDrawer
        onClose={() => setFiltersOpen(false)}
        open={filtersOpen && isActivitiesTab}
        title="Filter activities"
      >
        <div className="space-y-4">
          <FilterSelect
            label="Participant"
            onChange={setUserFilter}
            value={userFilter}
          >
            <option value="">All participants</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Date" onChange={setDateFilter} value={dateFilter}>
            <option value="">All dates</option>
            {challengeDays.map((day) => (
              <option key={day.date} value={day.date}>
                {formatDisplayDate(day.date)}
              </option>
            ))}
          </FilterSelect>

          <div className="flex gap-2 pt-1">
            <ActionButton
              onClick={() => {
                setUserFilter("");
                setDateFilter("");
                setFiltersOpen(false);
              }}
              variant="ghost"
            >
              Clear
            </ActionButton>
            <ActionButton onClick={() => setFiltersOpen(false)} variant="primary">
              Done
            </ActionButton>
          </div>
        </div>
      </BottomFilterDrawer>

      {message ? (
        <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-brand">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      {isActivitiesTab ? (
        <ActivitiesTab
          activities={filteredActivities}
          busyId={busyId}
          challengeDays={challengeDays}
          onDisapprove={(row, note) =>
            patchActivity(
              row.id,
              { status: "disapproved", adminNote: note || "Disapproved by admin" },
              "Activity disapproved",
            )
          }
          onApprove={(row) =>
            patchActivity(row.id, { status: "approved" }, "Activity approved")
          }
          onEdit={(row, steps, distanceKm, activityDate) =>
            patchActivity(
              row.id,
              { steps: Number(steps), distanceKm, activityDate },
              "Activity updated",
            )
          }
          onPreviewPhoto={setPhotoPreview}
          reviewTab={adminTab === "review" ? "review" : "approved"}
        />
      ) : adminTab === "participants" ? (
        <ParticipantsTab
          addOpen={addParticipantOpen}
          busyId={busyId}
          currentAdminId={currentAdminId}
          onAddOpenChange={setAddParticipantOpen}
          onCreate={createParticipant}
          onDelete={deleteParticipant}
          onResetPassword={resetParticipantPassword}
          onToggleRole={toggleRole}
          users={participantRows}
        />
      ) : (
        <ScoringTab
          busy={scoringBusy}
          dateInput={scoringDateInput}
          onAdvanceDay={() =>
            runScoring({ advanceDays: 1 }, "Scoring advanced by one day.")
          }
          onClearOverride={() =>
            runScoring({ asOfDate: null }, "Scoring reset to calendar today.")
          }
          onRecompute={() => runScoring({}, "Scores recomputed.")}
          onSetDate={() =>
            runScoring(
              { asOfDate: scoringDateInput },
              `Scoring date set to ${formatDisplayDate(scoringDateInput)}.`,
            )
          }
          onDateInputChange={setScoringDateInput}
          scoring={scoring}
        />
      )}

      {photoPreview ? (
        <PhotoLightbox onClose={() => setPhotoPreview(null)} url={photoPreview} />
      ) : null}
    </div>
  );
}

function ActivitiesTab({
  activities,
  challengeDays,
  reviewTab,
  onPreviewPhoto,
  onApprove,
  onDisapprove,
  onEdit,
  busyId,
}: {
  activities: AdminActivityRow[];
  challengeDays: ChallengeDayOption[];
  reviewTab: "review" | "approved";
  onPreviewPhoto: (url: string) => void;
  onApprove: (row: AdminActivityRow) => void;
  onDisapprove: (row: AdminActivityRow, note: string) => void;
  onEdit: (row: AdminActivityRow, steps: string, distanceKm: string, activityDate: string) => void;
  busyId: string | null;
}) {
  return (
    <section className="space-y-3">
      {activities.length === 0 ? (
        <EmptyCard
          text={
            reviewTab === "review"
              ? "No activities waiting for review."
              : "No approved activities yet."
          }
        />
      ) : (
        activities.map((row) => (
          <ActivityAdminCard
            busy={busyId === row.id}
            challengeDays={challengeDays}
            key={row.id}
            onApprove={() => onApprove(row)}
            onDisapprove={(note) => onDisapprove(row, note)}
            onEdit={(steps, distanceKm, activityDate) =>
              onEdit(row, steps, distanceKm, activityDate)
            }
            onPreviewPhoto={() => onPreviewPhoto(photoProxyUrl(row.photoUrl))}
            reviewTab={reviewTab}
            row={row}
          />
        ))
      )}
    </section>
  );
}

function ActivityAdminCard({
  row,
  challengeDays,
  reviewTab,
  onPreviewPhoto,
  onApprove,
  onDisapprove,
  onEdit,
  busy,
}: {
  row: AdminActivityRow;
  challengeDays: ChallengeDayOption[];
  reviewTab: "review" | "approved";
  onPreviewPhoto: () => void;
  onApprove: () => void;
  onDisapprove: (note: string) => void;
  onEdit: (steps: string, distanceKm: string, activityDate: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState(String(row.steps));
  const [distanceKm, setDistanceKm] = useState(String(Number(row.distanceKm)));
  const [activityDate, setActivityDate] = useState(row.activityDate);
  const [note, setNote] = useState(row.adminNote ?? "");

  return (
    <article className="rounded-2xl border border-black/5 bg-surface p-3">
      <div className="flex gap-3">
        <button
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={onPreviewPhoto}
          type="button"
        >
          <Image
            alt={`Proof for ${row.userName}`}
            className="object-cover"
            fill
            sizes="80px"
            src={photoProxyUrl(row.photoUrl)}
            unoptimized
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{row.userName}</p>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              W{row.weekNo}
            </span>
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatDisplayDate(row.activityDate)} · target{" "}
            {row.targetSteps.toLocaleString("en-IN")} ·{" "}
            <span className="font-medium text-foreground">
              {row.steps.toLocaleString("en-IN")} steps ·{" "}
              {formatDistanceKm(row.distanceKm)}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            Base points:{" "}
            <span className="font-semibold text-foreground">{row.basePoints}</span>
          </p>
          {row.adminNote ? (
            <p className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {row.adminNote}
            </p>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Steps</span>
            <input
              className="field-input"
              onChange={(event) => setSteps(event.target.value)}
              type="number"
              value={steps}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Distance (km)</span>
            <input
              className="field-input"
              onChange={(event) => setDistanceKm(event.target.value)}
              step={0.001}
              type="number"
              value={distanceKm}
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">Date</span>
            <select
              className="field-input"
              onChange={(event) => setActivityDate(event.target.value)}
              value={activityDate}
            >
              {challengeDays.map((day) => (
                <option key={day.date} value={day.date}>
                  {formatDisplayDate(day.date)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <ActionButton
              disabled={busy}
              onClick={() => {
                onEdit(steps, distanceKm, activityDate);
                setEditing(false);
              }}
              variant="primary"
            >
              Save edit
            </ActionButton>
            <ActionButton onClick={() => setEditing(false)} variant="ghost">
              Cancel
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={() => setEditing(true)} variant="ghost">
            Edit
          </ActionButton>
          {reviewTab === "approved" ? (
            <>
              <input
                className="field-input min-w-0 flex-1"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note if disapproving"
                value={note}
              />
              <ActionButton
                disabled={busy}
                onClick={() => onDisapprove(note)}
                variant="danger"
              >
                Disapprove
              </ActionButton>
            </>
          ) : (
            <ActionButton disabled={busy} onClick={onApprove} variant="primary">
              {row.status === "disapproved" ? "Re-approve" : "Approve"}
            </ActionButton>
          )}
        </div>
      )}
    </article>
  );
}

function ParticipantsTab({
  users,
  currentAdminId,
  addOpen,
  onAddOpenChange,
  onCreate,
  onToggleRole,
  onResetPassword,
  onDelete,
  busyId,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
  onCreate: (name: string, mobile: string) => void;
  onToggleRole: (user: AdminUserRow) => void;
  onResetPassword: (user: AdminUserRow) => void;
  onDelete: (user: AdminUserRow) => void;
  busyId: string | null;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ParticipantConfirmAction | null>(
    null,
  );

  function handleCreate() {
    setFormError(null);
    if (name.trim().length < 2) {
      setFormError("Enter the participant's name.");
      return;
    }
    if (mobile.replace(/\D/g, "").length < 10) {
      setFormError("Enter a valid 10-digit mobile number.");
      return;
    }
    onCreate(name.trim(), mobile);
    setName("");
    setMobile("");
  }

  function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    const { type, user } = confirmAction;
    setConfirmAction(null);

    if (type === "reset") {
      onResetPassword(user);
      return;
    }
    if (type === "role") {
      onToggleRole(user);
      return;
    }
    onDelete(user);
  }

  const confirmCopy = confirmAction
    ? getParticipantConfirmCopy(confirmAction)
    : null;

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <ActionButton onClick={() => onAddOpenChange(true)} variant="primary">
          Add participant
        </ActionButton>
      </div>

      <BottomFilterDrawer
        onClose={() => {
          onAddOpenChange(false);
          setFormError(null);
        }}
        open={addOpen}
        title="Add participant"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Default password is{" "}
            <span className="font-medium text-foreground">
              {DEFAULT_PARTICIPANT_PASSWORD}
            </span>
            . They must set a new password on first login.
          </p>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              className="field-input"
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              value={name}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Mobile</span>
            <input
              className="field-input"
              inputMode="numeric"
              onChange={(event) => setMobile(event.target.value)}
              placeholder="10-digit mobile number"
              type="tel"
              value={mobile}
            />
          </label>

          {formError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <ActionButton
              onClick={() => {
                onAddOpenChange(false);
                setFormError(null);
              }}
              variant="ghost"
            >
              Cancel
            </ActionButton>
            <ActionButton
              disabled={busyId === "add-participant"}
              onClick={handleCreate}
              variant="primary"
            >
              Add participant
            </ActionButton>
          </div>
        </div>
      </BottomFilterDrawer>

      <ConfirmDialog
        busy={Boolean(confirmAction && busyId === confirmAction.user.id)}
        confirmLabel={confirmCopy?.confirmLabel ?? "Confirm"}
        description={confirmCopy?.description ?? ""}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        open={Boolean(confirmAction)}
        title={confirmCopy?.title ?? ""}
        variant={confirmCopy?.variant ?? "default"}
      />

      {users.length === 0 ? (
        <EmptyCard text="No participants yet." />
      ) : (
        users.map((user) => (
          <article
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-surface px-4 py-3"
            key={user.id}
          >
            <div>
              <p className="font-medium text-foreground">
                {user.name}
                {user.id === currentAdminId ? (
                  <span className="ml-2 text-sm text-brand">You</span>
                ) : null}
              </p>
              <p className="text-sm text-muted">
                {user.mobile} · {user.role === "admin" ? "Admin" : "Participant"}
              </p>
              {user.mustChangePassword ? (
                <p className="mt-1 text-xs font-medium text-warning">
                  Must change password on login
                </p>
              ) : null}
            </div>
            {user.id !== currentAdminId ? (
              <ParticipantActionsMenu
                busy={busyId === user.id}
                onSelectAction={(type) => setConfirmAction({ type, user })}
                user={user}
              />
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}

type ParticipantConfirmAction = {
  type: "reset" | "role" | "delete";
  user: AdminUserRow;
};

function getParticipantConfirmCopy(action: ParticipantConfirmAction) {
  const { type, user } = action;

  if (type === "reset") {
    return {
      title: "Reset password?",
      description: `Reset ${user.name}'s password to "${DEFAULT_PARTICIPANT_PASSWORD}". They must choose a new password on next login.`,
      confirmLabel: "Reset password",
      variant: "default" as const,
    };
  }

  if (type === "role") {
    const makingAdmin = user.role !== "admin";
    return {
      title: makingAdmin ? "Make admin?" : "Make participant?",
      description: makingAdmin
        ? `${user.name} will be able to access admin tools including activity review.`
        : `${user.name} will lose admin access and remain a participant only.`,
      confirmLabel: makingAdmin ? "Make admin" : "Make participant",
      variant: "default" as const,
    };
  }

  return {
    title: "Delete participant?",
    description: `Delete ${user.name}? This removes all their activities, photos, and profile data permanently.`,
    confirmLabel: "Delete participant",
    variant: "danger" as const,
  };
}

function ParticipantActionsMenu({
  user,
  busy,
  onSelectAction,
}: {
  user: AdminUserRow;
  busy: boolean;
  onSelectAction: (type: ParticipantConfirmAction["type"]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${user.name}`}
        className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreVerticalIcon className="size-5" />
      </button>

      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-black/10 bg-surface py-1 shadow-lg ring-1 ring-black/5"
            role="menu"
          >
            <ParticipantMenuItem
              label="Reset password"
              onSelect={() => {
                setOpen(false);
                onSelectAction("reset");
              }}
            />
            <ParticipantMenuItem
              label={user.role === "admin" ? "Make participant" : "Make admin"}
              onSelect={() => {
                setOpen(false);
                onSelectAction("role");
              }}
            />
            <ParticipantMenuItem
              destructive
              label="Delete"
              onSelect={() => {
                setOpen(false);
                onSelectAction("delete");
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function ParticipantMenuItem({
  label,
  onSelect,
  destructive = false,
}: {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      className={cn(
        "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-brand/5",
        destructive ? "text-danger" : "text-foreground",
      )}
      onClick={onSelect}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger";
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        type="button"
      />
      <div
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-3xl border border-black/10 bg-surface p-5 shadow-lg ring-1 ring-black/5"
        role="alertdialog"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <ActionButton disabled={busy} onClick={onCancel} variant="ghost">
            Cancel
          </ActionButton>
          <ActionButton disabled={busy} onClick={onConfirm} variant={variant}>
            {busy ? "Working…" : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function ScoringTab({
  scoring,
  dateInput,
  busy,
  onDateInputChange,
  onRecompute,
  onSetDate,
  onClearOverride,
  onAdvanceDay,
}: {
  scoring: AdminScoringResult;
  dateInput: string;
  busy: boolean;
  onDateInputChange: (value: string) => void;
  onRecompute: () => void;
  onSetDate: () => void;
  onClearOverride: () => void;
  onAdvanceDay: () => void;
}) {
  const { state, standings, computedAt } = scoring;

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Scoring clock</h2>
        <p className="mt-2 text-sm text-muted">
          Star-of-day and week bonuses only apply after the scoring date passes each
          day or week. Use an override to test without waiting for real calendar time.
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-background px-4 py-3">
            <dt className="text-muted">Calendar today (IST)</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {formatDisplayDate(state.calendarToday)}
            </dd>
          </div>
          <div className="rounded-2xl bg-background px-4 py-3">
            <dt className="text-muted">Effective scoring date</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {formatDisplayDate(state.effectiveDate)}
              {state.usingOverride ? (
                <span className="ml-2 text-xs font-medium text-brand">override</span>
              ) : null}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="font-medium text-foreground">Scoring as-of date</span>
          <input
            className="field-input"
            onChange={(event) => onDateInputChange(event.target.value)}
            type="date"
            value={dateInput}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={onRecompute} variant="primary">
            Recompute scores
          </ActionButton>
          <ActionButton disabled={busy} onClick={onSetDate} variant="ghost">
            Set date & recompute
          </ActionButton>
          <ActionButton disabled={busy} onClick={onAdvanceDay} variant="ghost">
            Advance 1 day
          </ActionButton>
          <ActionButton disabled={busy} onClick={onClearOverride} variant="ghost">
            Use calendar today
          </ActionButton>
        </div>

        <p className="mt-3 text-xs text-muted">
          Last computed {new Date(computedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </p>
      </article>

      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Current standings</h2>
        {standings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No participants yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {standings.map((row) => (
              <ScoringStandingRow key={row.userId} row={row} />
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function ScoringStandingRow({ row }: { row: UserStanding }) {
  return (
    <div className="rounded-2xl bg-background px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            #{row.rank} {row.name}
          </p>
          <p className="mt-1 text-muted">
            Base {row.breakdown.base} · Star {row.breakdown.starDay} · Week{" "}
            {row.breakdown.weekStar} · Streak {row.breakdown.consistency}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {row.total}
        </p>
      </div>
    </div>
  );
}

function BottomFilterDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl rounded-t-3xl bg-surface px-4 pb-8 pt-3 shadow-[0_-8px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5"
        role="dialog"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            className="rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-brand/5 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        className="field-input"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        status === "approved" && "bg-success/10 text-brand",
        status === "pending" && "bg-warning/15 text-warning",
        status === "disapproved" && "bg-danger/10 text-danger",
      )}
    >
      {status === "pending" ? "Pending review" : status}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "ghost" | "danger" | "default";
}) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        (variant === "ghost" || variant === "default") &&
          "bg-background text-foreground hover:bg-brand/10",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-surface p-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <button
        aria-label="Close photo preview"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 max-h-[85vh] max-w-3xl overflow-hidden rounded-3xl bg-black">
        <Image
          alt="Activity proof"
          className="max-h-[85vh] w-auto object-contain"
          height={900}
          src={url}
          unoptimized
          width={900}
        />
      </div>
    </div>
  );
}
