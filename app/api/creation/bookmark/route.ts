import { NextRequest } from "next/server";
import { getDeviceUser } from "@/lib/auth/device";
import { addBookmark, removeBookmark, markFeedSeen } from "@/lib/data";
import { json, apiError, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

async function readCreationId(req: NextRequest): Promise<string | null> {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.creationId === "string" ? body.creationId.trim() : "";
  return id || null;
}

// POST /api/creation/bookmark  body: { creationId } — save a creation.
export async function POST(req: NextRequest) {
  const device = await getDeviceUser(req);
  if (!device) return apiError("auth_required", "Device not linked.", 401);

  const creationId = await readCreationId(req);
  if (!creationId) return apiError("invalid_body", "creationId is required.", 422);

  try {
    const created = await addBookmark(device.userId, creationId);
    // Engaging with a creation also marks it seen so it isn't re-served.
    await markFeedSeen(device.userId, [creationId]);
    return json({ ok: true, bookmarked: true, created });
  } catch (e) {
    console.error("[creation/bookmark] POST error:", e);
    return apiError("server_error", "Failed to bookmark.", 500);
  }
}

// DELETE /api/creation/bookmark  body: { creationId } — unsave.
export async function DELETE(req: NextRequest) {
  const device = await getDeviceUser(req);
  if (!device) return apiError("auth_required", "Device not linked.", 401);

  const creationId = await readCreationId(req);
  if (!creationId) return apiError("invalid_body", "creationId is required.", 422);

  try {
    await removeBookmark(device.userId, creationId);
    return json({ ok: true, bookmarked: false });
  } catch (e) {
    console.error("[creation/bookmark] DELETE error:", e);
    return apiError("server_error", "Failed to remove bookmark.", 500);
  }
}
