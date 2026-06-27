import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  ActivitiesSummary,
  ActivityLogList,
} from "@/components/activities/activities-dashboard";
import { getActivitiesDashboard } from "@/lib/activities-service";

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dashboard = await getActivitiesDashboard(session.user.id);
  const currentWeek =
    dashboard.dayRows.find((day) => day.date === dashboard.today)?.weekNo ?? 1;

  return (
    <div className="space-y-6 pb-4">
      <ActivitiesSummary
        currentWeek={currentWeek}
        participantCount={dashboard.participantCount}
        standing={dashboard.standing}
        weekStats={dashboard.weekStats}
      />
      <ActivityLogList activities={dashboard.loggedActivities} />
    </div>
  );
}
