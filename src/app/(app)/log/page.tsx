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
  searchParams: Promise<{ edit?: string }>;
};

export default async function LogPage({ searchParams }: LogPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { edit } = await searchParams;
  const userId = session.user.id;

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
          badgeCounts={badgesPage.badgeCounts}
          badges={badgesPage.badges}
          editActivity={editActivity}
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
      badgeCounts={badgesPage.badgeCounts}
      badges={badgesPage.badges}
      logContext={context}
    />
  );
}
