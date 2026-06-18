import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { signDeviceToken, setDeviceTokenCookie } from "@/lib/auth/device";

export const runtime = "nodejs";
export const maxDuration = 5;

// POST /api/link-r1 — consume a store link token from the /creation R1 client.
// Public (device not yet authenticated). Sets the boondit_cs_dt HttpOnly cookie.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(`cs-link-r1:${clientIp(req)}`, 30, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, device_id } = body as { token?: string; device_id?: string };
  if (!token || !device_id) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_store_link_token", {
    p_token: token,
    p_device_id: device_id,
  });

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  const userId = data[0].user_id ?? data[0].id;
  const deviceToken = signDeviceToken(device_id, userId);
  const res = NextResponse.json({ ok: true, username: data[0].username });
  setDeviceTokenCookie(res, deviceToken);
  return res;
}
