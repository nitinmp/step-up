import Link from "next/link";

import { auth, signOut } from "@/auth";
import { BottomNav } from "@/components/app/bottom-nav";
import { photoProxyUrl } from "@/lib/blob-storage";
import { computeStandings, getStandingForUser } from "@/lib/standings-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Step Up
            </p>
            <p className="text-sm text-muted-foreground">29-day challenge</p>
          </div>
          <div className="flex items-center gap-2">
            {standing ? (
              <Badge variant="secondary">
                #{standing.rank} · {standing.total} pts
              </Badge>
            ) : null}
            <Button
              asChild
              className="hidden h-9 gap-2 rounded-full sm:inline-flex"
              size="sm"
              variant="secondary"
            >
              <Link href="/profile">
                {session?.user.profileImageUrl ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      alt=""
                      src={photoProxyUrl(session.user.profileImageUrl)}
                    />
                    <AvatarFallback>
                      {session?.user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                {session?.user.name}
              </Link>
            </Button>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button size="sm" type="submit" variant="ghost">
                Log out
              </Button>
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
