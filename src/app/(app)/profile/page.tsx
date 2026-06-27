import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <ProfileForm />;
}
