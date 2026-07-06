import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ParticipantBadgesView } from "@/components/leaderboard/participant-badges-view";
import { getParticipantBadgesPage } from "@/lib/participant-badges-service";

type ParticipantBadgesPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ParticipantBadgesPage({
  params,
}: ParticipantBadgesPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { userId } = await params;
  const data = await getParticipantBadgesPage(userId);
  if (!data) {
    notFound();
  }

  return (
    <ParticipantBadgesView
      currentUserId={session.user.id}
      data={data}
    />
  );
}
