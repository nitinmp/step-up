import { auth } from "@/auth";
import { BottomNav } from "@/components/app/bottom-nav";
import { HeaderProfileLink } from "@/components/app/header-profile-link";
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
            {session?.user ? (
              <HeaderProfileLink
                name={session.user.name}
                photoSrc={
                  session.user.profileImageUrl
                    ? photoProxyUrl(session.user.profileImageUrl)
                    : undefined
                }
                profileImageUrl={session.user.profileImageUrl}
              />
            ) : null}
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
