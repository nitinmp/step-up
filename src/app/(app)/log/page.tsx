import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogPageClient } from "@/components/activities/log-page-client";
import {
  ActivityError,
  getEditActivityContext,
  getLogContext,
} from "@/lib/activities-service";
import { getParticipantBadgesPage } from "@/lib/participant-badges-service";

type LogPageProps = {
  searchParams: Promise<{
    edit?: string;
    cert?: string;
    week?: string;
    tab?: string;
  }>;
};

function resolveInitialTab(
  tab: string | undefined,
  certDate: string | undefined,
  week: string | undefined,
): "badges" | "certificates" {
  if (tab === "certificates" || certDate || week) {
    return "certificates";
  }

  return "badges";
}

function resolveInitialWeekNo(week: string | undefined): number | null {
  if (!week) {
    return null;
  }

  const parsed = Number.parseInt(week, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    return null;
  }

  return parsed;
}

export default async function LogPage({ searchParams }: LogPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { edit, cert: certDate, week, tab } = await searchParams;
  const userId = session.user.id;
  const initialTab = resolveInitialTab(tab, certDate, week);
  const initialWeekNo = resolveInitialWeekNo(week);

  const [context, badgesPage] = await Promise.all([
    getLogContext(userId),
    getParticipantBadgesPage(userId),
  ]);

  if (!badgesPage) {
    redirect("/login");
  }

  if (edit) {
    try {
      const editActivity = await getEditActivityContext(userId, edit);
      if (!editActivity) {
        redirect("/log");
      }

      return (
        <LogPageClient
          achievements={badgesPage.achievements}
          badgeEarnedCount={badgesPage.badgeEarnedCount}
          badgeTotalCount={badgesPage.badgeTotalCount}
          editActivity={editActivity}
          initialStarDate={certDate ?? null}
          initialTab={initialTab}
          initialWeekNo={initialWeekNo}
          logContext={context}
        />
      );
    } catch (error) {
      if (error instanceof ActivityError && error.status === 403) {
        redirect("/activities");
      }
      redirect("/log");
    }
  }

  return (
    <LogPageClient
      achievements={badgesPage.achievements}
      badgeEarnedCount={badgesPage.badgeEarnedCount}
      badgeTotalCount={badgesPage.badgeTotalCount}
      initialStarDate={certDate ?? null}
      initialTab={initialTab}
      initialWeekNo={initialWeekNo}
      logContext={context}
    />
  );
}
