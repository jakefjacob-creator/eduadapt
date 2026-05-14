"use client";

import { useAuth } from "@/components/AuthProvider";

/**
 * Conditionally renders content based on authentication state.
 * Conditionally renders content based on authentication state.
 */
export function AuthAware({
  signedIn,
  signedOut,
}: {
  signedIn?: React.ReactNode;
  signedOut?: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? signedIn : signedOut;
}
