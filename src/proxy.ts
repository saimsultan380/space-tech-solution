import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Optimization: skip middleware for static/public routes early
  // though the matcher should handle most of this.
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run session refresh + route guards only where needed.
     * Public marketing/legal pages (/, /privacy, /terms) skip this entirely.
     */
    "/dashboard/:path*",
    "/chat/:path*",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/reset-password/:path*",
  ],
};
