import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  ActivityDayList,
  ActivitiesSummary,
} from "@/components/activities/activities-dashboard";
import { getActivitiesDashboard } from "@/lib/activities-service";

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dashboard = await getActivitiesDashboard(session.user.id);

  return (
    <div className="space-y-6 pb-4">
      <ActivitiesSummary
        participantCount={dashboard.participantCount}
        standing={dashboard.standing}
      />
      <ActivityDayList days={dashboard.dayRows} />
    </div>
  );
}
