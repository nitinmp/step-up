import Link from "next/link";

import { auth, signOut } from "@/auth";
import { computeStandings, getStandingForUser } from "@/lib/standings-service";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const standings = session?.user?.id ? await computeStandings() : [];
  const standing = session?.user?.id
    ? getStandingForUser(standings, session.user.id)
    : undefined;

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Step Up
            </p>
            <p className="text-sm text-muted">29-day challenge</p>
          </div>
          <div className="flex items-center gap-2">
            {standing ? (
              <span className="rounded-full bg-gold/20 px-3 py-1 text-sm font-semibold text-foreground">
                #{standing.rank} · {standing.total} pts
              </span>
            ) : null}
            <span className="hidden rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand sm:inline">
              {session?.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                className="text-sm font-medium text-muted hover:text-foreground"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/5 bg-surface/95 backdrop-blur">
        <div
          className={`mx-auto grid max-w-3xl gap-1 px-2 py-2 ${session?.user.role === "admin" ? "grid-cols-4" : "grid-cols-3"}`}
        >
          <BottomNavLink href="/activities">Activities</BottomNavLink>
          <BottomNavLink href="/log">Log</BottomNavLink>
          <BottomNavLink href="/leaderboard">Board</BottomNavLink>
          {session?.user.role === "admin" ? (
            <BottomNavLink href="/admin">Admin</BottomNavLink>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function BottomNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="rounded-2xl px-2 py-3 text-center text-sm font-medium text-muted transition hover:bg-brand/10 hover:text-brand"
      href={href}
    >
      {children}
    </Link>
  );
}
