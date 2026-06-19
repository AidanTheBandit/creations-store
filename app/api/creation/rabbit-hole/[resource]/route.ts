import { NextRequest } from "next/server";
import { getDeviceUser } from "@/lib/auth/device";
import { getCurrentUser } from "@/lib/auth";
import { json, apiError, preflight } from "@/lib/api/respond";
import { fetchRabbitHole, isRabbitResource } from "@/lib/rabbit-hole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

// GET /api/creation/rabbit-hole/[resource]
// Device-token authed (the /creation R1 client), falling back to a logged-in
// dashboard session. Returns the requesting user's own rabbit hole data.
// resource ∈ profile | journal | sessions | device
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!isRabbitResource(resource))
    return apiError("not_found", "Unknown rabbit hole resource.", 404);

  const device = await getDeviceUser(req);
  const userId = device?.userId ?? (await getCurrentUser())?.id ?? null;
  if (!userId) return apiError("unauthorized", "Link your account first.", 401);

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days")) || undefined;

  const result = await fetchRabbitHole(userId, resource, { days });
  if (!result.ok) {
    if (result.error === "no_token")
      return apiError(
        "rabbit_hole_not_connected",
        "Connect your rabbit hole account in Settings → Experiments.",
        400,
      );
    if (result.error === "upstream_auth")
      return apiError(
        "rabbit_hole_auth",
        "Your rabbit hole token is invalid or expired. Re-connect it in Settings.",
        401,
      );
    return apiError("rabbit_hole_error", "rabbit hole request failed.", 502);
  }

  return json({ data: result.data });
}
