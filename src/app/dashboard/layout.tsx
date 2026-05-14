import { redirect } from "next/navigation";
import { ensureUser } from "@/lib/auth";
import DashboardHeader from "@/components/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ensureUser() returns null if the Clerk user hasn't picked a role yet.
  const user = await ensureUser();
  if (!user) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <DashboardHeader name={user.name} role={user.role} />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
