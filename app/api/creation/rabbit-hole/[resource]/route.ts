import { NextRequest } from "next/server";
import { getDeviceUser } from "@/lib/auth/device";
import { getCurrentUser } from "@/lib/auth";
import { json, apiError, preflight } from "@/lib/api/respond";
import { callRabbitHole, isRabbitResource, RH_SPECS } from "@/lib/rabbit-hole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const device = await getDeviceUser(req);
  return device?.userId ?? (await getCurrentUser())?.id ?? null;
}

function mapError(error: string) {
  if (error === "no_token")
    return apiError(
      "rabbit_hole_not_connected",
      "Connect your rabbit hole account in Settings → Experiments.",
      400,
    );
  if (error === "wrong_method")
    return apiError(
      "method_not_allowed",
      "This resource uses a different HTTP method.",
      405,
    );
  if (error === "upstream_auth")
    return apiError(
      "rabbit_hole_auth",
      "Your rabbit hole token is invalid or expired. Re-connect it in Settings.",
      401,
    );
  return apiError("rabbit_hole_error", "rabbit hole request failed.", 502);
}

// GET /api/creation/rabbit-hole/[resource] — read resources.
// Device-token authed (the /creation R1 client), falling back to a logged-in
// dashboard session. Returns the requesting user's own rabbit hole data.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!isRabbitResource(resource))
    return apiError("not_found", "Unknown rabbit hole resource.", 404);

  const userId = await resolveUserId(req);
  if (!userId) return apiError("unauthorized", "Link your account first.", 401);

  const url = new URL(req.url);
  const input: Record<string, unknown> = {};
  // sessions supports ?days / ?nDays / ?maxResults via query for convenience.
  for (const k of ["days", "nDays", "maxResults"]) {
    const v = url.searchParams.get(k);
    if (v != null) input[k] = v;
  }

  const result = await callRabbitHole(userId, resource, input, "read");
  if (!result.ok) return mapError(result.error);
  return json({ data: result.data });
}

// POST /api/creation/rabbit-hole/[resource] — write resources (mutations).
// Body is the resource-specific payload (e.g. { customPrompt }, { enrolled }).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!isRabbitResource(resource))
    return apiError("not_found", "Unknown rabbit hole resource.", 404);
  if (RH_SPECS[resource].kind !== "write")
    return apiError("method_not_allowed", "This resource is read-only; use GET.", 405);

  const userId = await resolveUserId(req);
  if (!userId) return apiError("unauthorized", "Link your account first.", 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await callRabbitHole(userId, resource, body, "write");
  if (!result.ok) return mapError(result.error);
  return json({ data: result.data });
}
