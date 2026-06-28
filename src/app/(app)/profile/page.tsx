import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <ProfileForm />
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          className="w-full rounded-2xl border border-black/10 bg-surface px-4 py-3 text-base font-semibold text-muted transition hover:border-black/20 hover:text-foreground"
          type="submit"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
