import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogActivityForm } from "@/components/activities/log-activity-form";
import {
  ActivityError,
  getEditActivityContext,
  getLogContext,
} from "@/lib/activities-service";

type LogPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function LogPage({ searchParams }: LogPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { edit } = await searchParams;

  if (edit) {
    try {
      const editActivity = await getEditActivityContext(session.user.id, edit);
      if (!editActivity) {
        redirect("/log");
      }

      return <LogActivityForm editActivity={editActivity} />;
    } catch (error) {
      if (error instanceof ActivityError && error.status === 403) {
        redirect("/activities");
      }
      redirect("/log");
    }
  }

  const context = await getLogContext(session.user.id);

  return (
    <LogActivityForm
      allowOpenChallengeLogging={context.allowOpenChallengeLogging}
      challengeStartDate={context.challengeStartDate}
      defaultDate={context.defaultDate}
      loggedDates={context.loggedDates}
      selectableDays={context.selectableDays}
    />
  );
}
