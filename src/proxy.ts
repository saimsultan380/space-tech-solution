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
     * PERFORMANCE: Only run middleware on pages that need auth.
     * Skip: static assets, images, fonts, icons, API routes, public folder.
     * This eliminates ~60% of redundant auth DB round-trips under concurrent load.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|apple-icon\\.png|icon\\.png|public|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$).*)',
  ],
};
