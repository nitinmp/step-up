import Link from "next/link";

import { cn } from "@/lib/cn";

export function participantBadgesHref(userId: string): string {
  return `/leaderboard/participant/${userId}`;
}

export function ParticipantProfileLink({
  userId,
  className,
  children,
}: {
  userId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={cn(
        "rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        className,
      )}
      href={participantBadgesHref(userId)}
    >
      {children}
    </Link>
  );
}
