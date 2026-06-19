import { guard, json, apiError, preflight } from "@/lib/api/respond";
import { hasScope } from "@/lib/api/keys";
import { fetchRabbitHole, isRabbitResource } from "@/lib/rabbit-hole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

// GET /api/v1/rabbithole/[resource]
// Public key surface. Requires a store API key with the 'rabbithole' scope;
// returns that key owner's own rabbit hole data (their stored token).
// resource ∈ profile | journal | sessions | device
export async function GET(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  // read mode gives us rate-limiting + key resolution; we then require a key
  // with the rabbithole scope (anonymous is not allowed here).
  const g = await guard(req, { mode: "read" });
  if ("error" in g) return g.error;
  const { key, rl } = g.ctx;

  if (!key)
    return apiError(
      "auth_required",
      "This endpoint requires an API key with the 'rabbithole' scope.",
      401,
      rl,
    );
  if (!hasScope(key, "rabbithole"))
    return apiError("forbidden", "API key lacks the 'rabbithole' scope.", 403, rl);

  const { resource } = await params;
  if (!isRabbitResource(resource))
    return apiError("not_found", "Unknown rabbit hole resource.", 404, rl);

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days")) || undefined;

  const result = await fetchRabbitHole(key.userId, resource, { days });
  if (!result.ok) {
    if (result.error === "no_token")
      return apiError(
        "rabbit_hole_not_connected",
        "Connect your rabbit hole account in Settings → Experiments.",
        400,
        rl,
      );
    if (result.error === "upstream_auth")
      return apiError(
        "rabbit_hole_auth",
        "The stored rabbit hole token is invalid or expired.",
        401,
        rl,
      );
    return apiError("rabbit_hole_error", "rabbit hole request failed.", 502, rl);
  }

  return json({ data: result.data }, { rl });
}
