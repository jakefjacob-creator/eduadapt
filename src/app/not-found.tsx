import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="card max-w-md p-8 text-center">
        <div className="text-4xl">🧭</div>
        <h1 className="mt-3 text-2xl font-extrabold">Page not found</h1>
        <p className="mt-1 text-muted">
          We couldn&rsquo;t find that page — or you don&rsquo;t have access to
          it. Let&rsquo;s get you back on track.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
