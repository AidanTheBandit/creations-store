import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { recordDetailClick } from "@/lib/analytics";
import { json, apiError, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

// POST /api/creation/view  body: { creationId: string }
// Records an "open" from the /creation R1 client as a click event, so the
// store feed contributes to a creation's analytics + quality score. Session-
// keyed (IP + device) to match the rest of the analytics pipeline; no auth
// required (guests browsing should still count).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const creationId =
    typeof body.creationId === "string" ? body.creationId : "";
  if (!creationId) {
    return apiError("invalid_body", "creationId is required.", 422);
  }
  // Synthetic ids from external repos (e.g. the Rabbit Creations Repo experiment,
  // "rabbit:<hash>") aren't real store_creations rows — skip analytics so we
  // don't hit a uuid-cast error in recordDetailClick.
  if (creationId.includes(":")) {
    return json({ ok: true, skipped: "external" });
  }

  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip") || "localhost";
  const normIp =
    ip === "::1" || ip === "127.0.0.1" || ip === "localhost" ? "local_dev" : ip;
  const ua = h.get("user-agent") || "Unknown";
  // Distinct namespace so store-client opens don't collide with web sessions.
  const sessionId = `r1creation_${normIp}`;

  try {
    await recordDetailClick(creationId, sessionId, ua, "r1-creation-store");
    return json({ ok: true });
  } catch (e) {
    console.error("[creation/view] error:", e);
    return apiError("server_error", "Failed to record view.", 500);
  }
}
