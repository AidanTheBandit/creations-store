import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authenticateDevice, applyTokenUpdates } from "@/lib/auth/device";

// GET /api/me — current user via device-token (the /creation client) OR
// Supabase session (web). The /creation client polls this on boot to learn
// whether the device is linked and to whom.
export async function GET(req: NextRequest) {
  const auth = await authenticateDevice(req);

  if (auth) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("id, username, avatar_url")
      .eq("id", auth.userId)
      .maybeSingle();

    if (!profile) {
      const res = NextResponse.json({ error: "device_not_linked" }, { status: 401 });
      applyTokenUpdates(res, auth);
      return res;
    }
    const res = NextResponse.json({ user: profile });
    applyTokenUpdates(res, auth);
    return res;
  }

  // Session auth (web browser)
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ user: profile });
}
