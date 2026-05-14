import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureUser } from "@/lib/auth";
import DashboardHeader from "@/components/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (!userId) redirect("/sign-in");

  // ensureUser() returns null if the user hasn't picked a role yet.
  const user = await ensureUser(userId);
  if (!user) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <DashboardHeader name={user.name} role={user.role} />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
