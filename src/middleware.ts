import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes reachable without signing in.
const publicPaths = ["/", "/sign-in", "/sign-up", "/invite", "/auth"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session and get the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Redirect unauthenticated users to sign-in (except public routes and API)
  if (!user && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Pass user ID and access token to downstream server components
  if (user) {
    res.headers.set("x-user-id", user.id);

    // Get the session to extract the access token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      res.headers.set("x-access-token", session.access_token);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/", "/(api|trpc)(.*)"],
};
