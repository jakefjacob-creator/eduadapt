import Link from "next/link";
import ChildCreateForm from "@/components/ChildCreateForm";

export default function NewChildPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-muted hover:text-ink"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold">Add a child</h1>
      <p className="mb-6 mt-1 text-muted">
        Three short steps: the basics, their EHCP, and an onboarding quiz that
        teaches EduAdapt who this child is.
      </p>
      <ChildCreateForm />
    </div>
  );
}
