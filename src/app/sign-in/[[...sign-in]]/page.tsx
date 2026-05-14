import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-extrabold">
          Welcome back to <span className="text-coral">EduAdapt</span>
        </h1>
        <div className="grid place-items-center">
          <SignIn
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/sign-up"
            appearance={{ elements: { card: "shadow-soft" } }}
          />
        </div>
      </div>
    </main>
  );
}
