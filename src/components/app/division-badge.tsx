import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";
import { cn } from "@/lib/cn";

export function EliteBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white",
        className,
      )}
    >
      Elite
    </span>
  );
}

export function RiserBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-amber-300/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100",
        className,
      )}
    >
      Riser
    </span>
  );
}

export function DivisionBadge({
  division,
  className,
}: {
  division: Division;
  className?: string;
}) {
  if (division === "elite") {
    return <EliteBadge className={className} />;
  }
  if (division === "riser") {
    return <RiserBadge className={className} />;
  }
  return null;
}

export function DivisionRankLabel({
  rank,
  division,
  participantCount,
  className,
}: {
  rank: number | string;
  division: Division;
  participantCount: number;
  className?: string;
}) {
  return (
    <p className={className}>
      Rank #{rank} of {participantCount} {divisionLabel(division, true)}
    </p>
  );
}

export function AdminDivisionBadge({
  division,
  className,
}: {
  division: Division;
  className?: string;
}) {
  if (division === "elite") {
    return (
      <span
        className={cn(
          "rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold uppercase text-foreground",
          className,
        )}
      >
        Elite
      </span>
    );
  }
  if (division === "riser") {
    return (
      <span
        className={cn(
          "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold uppercase text-amber-800",
          className,
        )}
      >
        Riser
      </span>
    );
  }
  return null;
}
