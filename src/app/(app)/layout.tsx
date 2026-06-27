import Link from "next/link";
import Image from "next/image";

import { auth, signOut } from "@/auth";
import { BottomNav } from "@/components/app/bottom-nav";
import { photoProxyUrl } from "@/lib/blob-storage";
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
            <Link
              className="hidden items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand sm:inline-flex"
              href="/profile"
            >
              {session?.user.profileImageUrl ? (
                <span className="relative h-6 w-6 overflow-hidden rounded-full">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="24px"
                    src={photoProxyUrl(session.user.profileImageUrl)}
                    unoptimized
                  />
                </span>
              ) : null}
              {session?.user.name}
            </Link>
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

      <BottomNav isAdmin={session?.user.role === "admin"} />
    </div>
  );
}
