import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDbUser } from "@/lib/auth";
import RoleSelect from "@/components/RoleSelect";

export default async function OnboardingPage() {
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (!userId) redirect("/sign-in");

  // Already onboarded? Straight to the dashboard.
  const user = await getDbUser(userId);
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-coral text-xl font-extrabold text-white shadow-soft">
            E
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">
            Welcome to EduAdapt
          </h1>
          <p className="mt-2 text-muted">
            One quick question so we can set up the right experience for you.
          </p>
        </div>
        <RoleSelect />
      </div>
    </main>
  );
}
