import { NextResponse } from "next/server";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/device";

export const runtime = "nodejs";

// POST /api/unlink-r1 — sign the device out of the /creation client by clearing
// the boondit_cs_dt cookie. The store_device_links row is left intact (the
// device can re-link from settings); this just drops the credential on-device.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEVICE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    domain: process.env.COOKIE_DOMAIN || ".boondit.site",
  });
  return res;
}
