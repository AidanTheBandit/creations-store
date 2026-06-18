import { NextRequest } from "next/server";
import { getDeviceUser } from "@/lib/auth/device";
import { markFeedSeen } from "@/lib/data";
import { json, apiError, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

// POST /api/creation/feed/seen  body: { creationIds: string[] }
// Marks creations as seen so the swipe feed doesn't repeat them.
export async function POST(req: NextRequest) {
  const device = await getDeviceUser(req);
  if (!device) {
    return apiError("auth_required", "Device not linked.", 401);
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.creationIds)
    ? body.creationIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 100)
    : [];
  if (ids.length === 0) return json({ ok: true, count: 0 });

  try {
    await markFeedSeen(device.userId, ids);
    return json({ ok: true, count: ids.length });
  } catch (e) {
    console.error("[creation/feed/seen] error:", e);
    return apiError("server_error", "Failed to record seen.", 500);
  }
}
