import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ActivitiesHome } from "@/components/activities/activities-home";
import { getActivitiesDashboard } from "@/lib/activities-service";

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dashboard = await getActivitiesDashboard(session.user.id);

  return (
    <ActivitiesHome
      aggregates={dashboard.aggregates}
      badgeEarnedCount={dashboard.badgeEarnedCount}
      badgePreview={dashboard.badgePreview}
      badgeTotalCount={dashboard.badgeTotalCount}
      challengeDayIndex={dashboard.challengeDayIndex}
      challengeTotalDays={dashboard.challengeTotalDays}
      climbWeeks={dashboard.climbWeeks}
      currentWeek={dashboard.currentWeek}
      division={dashboard.division}
      loggedActivities={dashboard.loggedActivities}
      points={dashboard.points}
      pushCallout={dashboard.pushCallout}
      rankChase={dashboard.rankChase}
      starCertificateDates={dashboard.starCertificateDates}
      streakCalendar={dashboard.streakCalendar}
    />
  );
}
