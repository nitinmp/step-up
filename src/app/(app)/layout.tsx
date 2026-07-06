import { auth } from "@/auth";
import { BottomNav } from "@/components/app/bottom-nav";
import { HeaderDivisionChip } from "@/components/app/header-division-chip";
import { HeaderProfileLink } from "@/components/app/header-profile-link";
import { photoProxyUrl } from "@/lib/blob-storage";
import { getActivitiesDashboard } from "@/lib/activities-service";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const dashboard = session?.user?.id
    ? await getActivitiesDashboard(session.user.id)
    : null;

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Step Up
            </p>
            {dashboard ? (
              <p className="text-sm text-muted">
                Day {dashboard.challengeDayIndex} of {dashboard.challengeTotalDays}{" "}
                · Week {dashboard.currentWeek}
              </p>
            ) : (
              <p className="text-sm text-muted">29-day challenge</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dashboard ? (
              <HeaderDivisionChip division={dashboard.division} />
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
