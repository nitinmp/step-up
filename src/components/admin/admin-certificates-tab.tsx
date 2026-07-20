"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { AdminDivisionBadge } from "@/components/app/division-badge";
import type {
  AdminCertificateDayRow,
  AdminCertificateSnapshot,
} from "@/lib/certificate-admin-service";
import { photoProxyUrl } from "@/lib/blob-storage";
import { formatDisplayDate } from "@/lib/dates";
import { divisionLabel } from "@/lib/divisions";
import { cn } from "@/lib/cn";

type CertificatesTabProps = {
  initialSnapshot: AdminCertificateSnapshot;
  busyDate: string | null;
  onGenerate: (date: string, regenerate: boolean) => Promise<boolean>;
};

function formatGeneratedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CertificatesTab({
  initialSnapshot,
  busyDate,
  onGenerate,
}: CertificatesTabProps) {
  const [days, setDays] = useState(initialSnapshot.days);
  const [viewDay, setViewDay] = useState<AdminCertificateDayRow | null>(null);

  async function handleGenerate(date: string, regenerate: boolean) {
    const ok = await onGenerate(date, regenerate);
    if (!ok) {
      return;
    }

    const response = await fetch("/api/admin/certificates");
    if (!response.ok) {
      return;
    }

    const snapshot = (await response.json()) as AdminCertificateSnapshot;
    setDays(snapshot.days);
    const refreshed = snapshot.days.find((day) => day.date === date) ?? null;
    if (refreshed && viewDay?.date === date) {
      setViewDay(refreshed);
    }
  }

  return (
    <section className="space-y-3">
      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Star of the Day</h2>
        <p className="mt-2 text-sm text-muted">
          Generate certificates for ended challenge days. Winners are picked per
          division from approved activities.
        </p>
      </article>

      {days.length === 0 ? (
        <EmptyCard text="No ended days yet." />
      ) : (
        days.map((day) => (
          <article
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-surface px-4 py-3"
            key={day.date}
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {formatDisplayDate(day.date)}
              </p>
              <p className="text-sm text-muted">
                Week {day.weekNo} · Target{" "}
                {day.targetSteps.toLocaleString("en-IN")} steps
              </p>
              <p className="mt-1 text-sm text-muted">
                {day.status === "generated" ? (
                  <>
                    {day.certificates.length} certificate
                    {day.certificates.length === 1 ? "" : "s"} generated
                    {formatGeneratedAt(day.generatedAt)
                      ? ` · ${formatGeneratedAt(day.generatedAt)} IST`
                      : ""}
                  </>
                ) : day.status === "incomplete" ? (
                  <>
                    Last generation did not finish — use Generate to retry
                    {formatGeneratedAt(day.generatedAt)
                      ? ` · ${formatGeneratedAt(day.generatedAt)} IST`
                      : ""}
                  </>
                ) : day.winnerCount > 0 ? (
                  <>
                    {day.winnerCount} star winner
                    {day.winnerCount === 1 ? "" : "s"} ready to generate
                  </>
                ) : (
                  "No star winners yet"
                )}
              </p>
              {day.winners.length > 0 ? (
                <p className="mt-1 truncate text-xs text-muted">
                  {day.winners
                    .map(
                      (winner) =>
                        `${winner.name} (${divisionLabel(winner.division)})`,
                    )
                    .join(" · ")}
                </p>
              ) : null}
            </div>

            <CertificateDayActionsMenu
              busy={busyDate === day.date}
              day={day}
              onGenerate={(regenerate) => void handleGenerate(day.date, regenerate)}
              onView={() => setViewDay(day)}
            />
          </article>
        ))
      )}

      <CertificateViewDrawer day={viewDay} onClose={() => setViewDay(null)} />
    </section>
  );
}

function CertificateDayActionsMenu({
  day,
  busy,
  onGenerate,
  onView,
}: {
  day: AdminCertificateDayRow;
  busy: boolean;
  onGenerate: (regenerate: boolean) => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasExistingAttempt =
    day.status === "generated" || day.status === "incomplete";
  const canGenerate = day.winnerCount > 0;
  const canView = day.certificates.length > 0;
  const canRegenerate = day.winnerCount > 0 && hasExistingAttempt;

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Certificate actions for ${formatDisplayDate(day.date)}`}
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
            <CertificateMenuItem
              disabled={!canGenerate || busy}
              label="Generate"
              onSelect={() => {
                setOpen(false);
                onGenerate(false);
              }}
            />
            <CertificateMenuItem
              disabled={!canView || busy}
              label="View certificates"
              onSelect={() => {
                setOpen(false);
                onView();
              }}
            />
            <CertificateMenuItem
              disabled={!canRegenerate || busy}
              label="Regenerate"
              onSelect={() => {
                setOpen(false);
                onGenerate(true);
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function CertificateMenuItem({
  label,
  onSelect,
  disabled = false,
}: {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "block w-full px-4 py-2.5 text-left text-sm transition",
        disabled
          ? "cursor-not-allowed text-muted/50"
          : "text-foreground hover:bg-brand/5",
      )}
      disabled={disabled}
      onClick={onSelect}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}

function CertificateViewDrawer({
  day,
  onClose,
}: {
  day: AdminCertificateDayRow | null;
  onClose: () => void;
}) {
  return (
    <BottomFilterDrawer
      onClose={onClose}
      open={Boolean(day)}
      title={day ? `${formatDisplayDate(day.date)} certificates` : "Certificates"}
    >
      {day ? (
        day.certificates.length === 0 ? (
          <p className="text-sm text-muted">
            No certificates generated for this day yet.
          </p>
        ) : (
          <div className="space-y-4">
            {day.certificates.map((certificate) => (
              <article
                className="overflow-hidden rounded-2xl border border-black/10 bg-background"
                key={certificate.id}
              >
                <div className="relative aspect-[1200/848] w-full bg-white">
                  <Image
                    alt={`Star of the Day certificate for ${certificate.recipientName}`}
                    className="object-contain"
                    fill
                    sizes="(max-width: 768px) 100vw, 640px"
                    src={photoProxyUrl(certificate.imageUrl)}
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {certificate.recipientName}
                    </p>
                    <p className="text-sm text-muted">
                      {certificate.steps.toLocaleString("en-IN")} steps
                    </p>
                  </div>
                  <AdminDivisionBadge division={certificate.division} />
                </div>
                <div className="border-t border-black/5 px-4 py-3">
                  <a
                    className="inline-flex rounded-full bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/15"
                    download={`star-day-${day.date}-${certificate.recipientName.replace(/\s+/g, "-").toLowerCase()}.png`}
                    href={photoProxyUrl(certificate.imageUrl)}
                  >
                    Download PNG
                  </a>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </BottomFilterDrawer>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-surface px-4 py-8 text-center text-sm text-muted">
      {text}
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
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-3xl bg-surface shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-brand/5 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
          {children}
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
