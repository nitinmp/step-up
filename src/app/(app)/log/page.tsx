import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogActivityForm } from "@/components/activities/log-activity-form";
import { getLogContext } from "@/lib/activities-service";

export default async function LogPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const context = await getLogContext(session.user.id);

  return (
    <LogActivityForm
      defaultDate={context.defaultDate}
      loggedDates={context.loggedDates}
      selectableDays={context.selectableDays}
    />
  );
}
