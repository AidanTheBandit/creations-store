import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 5;

const LINK_TOKEN_TTL_MINUTES = 10;

// POST /api/link-token — web (session-authed). Mints a short-lived token the
// /creation R1 client exchanges for a device binding. Store-namespaced
// (store_link_tokens), independent of rhythm.
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`cs-link-token:${user.id}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("store_link_tokens")
    .insert({
      user_id: user.id,
      expires_at: new Date(
        Date.now() + LINK_TOKEN_TTL_MINUTES * 60 * 1000,
      ).toISOString(),
    })
    .select("token, expires_at")
    .single();

  if (error) {
    console.error("[link-token] insert failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
