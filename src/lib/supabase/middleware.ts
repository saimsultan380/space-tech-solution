import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname === "/login";
  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");

  if (!user && isDashboardPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated but disabled in app profile, force them back to login
  if (user && isDashboardPage) {
    const activeCookie = request.cookies.get("sb-active-cache")?.value;
    
    // If we have a cached 'active' status, we can skip the DB query
    if (activeCookie !== "true") {
      try {
        const { data: profile, error } = await supabase
          .from("users")
          .select("is_active")
          .eq("id", user.id)
          .single();

        if (!error && profile) {
          if (profile.is_active === false) {
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore
            }
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("inactive", "1");
            return NextResponse.redirect(url);
          } else {
            // Cache the active status for 5 minutes to speed up subsequent requests
            supabaseResponse.cookies.set("sb-active-cache", "true", {
              maxAge: 300, // 5 minutes
              path: "/",
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
