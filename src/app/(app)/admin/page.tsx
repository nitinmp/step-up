import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminPanel } from "@/components/admin/admin-panel";
import {
  listAdminActivities,
  listAdminUsers,
} from "@/lib/admin-service";
import { getChallengeWindow } from "@/lib/activities-service";
import { getAdminCertificateSnapshot } from "@/lib/certificate-admin-service";
import { getAdminScoringSnapshot } from "@/lib/scoring-admin-service";

export default async function AdminPage() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    redirect("/activities");
  }

  const [{ days }, activities, users, initialScoring, initialCertificates] =
    await Promise.all([
    getChallengeWindow(),
    listAdminActivities(),
    listAdminUsers(),
    getAdminScoringSnapshot(),
    getAdminCertificateSnapshot(),
  ]);

  return (
    <AdminPanel
      challengeDays={days}
      currentAdminId={session.user.id}
      initialActivities={activities}
      initialCertificates={initialCertificates}
      initialScoring={initialScoring}
      users={users}
    />
  );
}
