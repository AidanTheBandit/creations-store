import { guard, json, apiError, preflight } from "@/lib/api/respond";
import { hasScope } from "@/lib/api/keys";
import { callRabbitHole, isRabbitResource, RH_SPECS } from "@/lib/rabbit-hole";
import type { RateResult } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

function mapError(error: string, rl: RateResult) {
  if (error === "no_token")
    return apiError(
      "rabbit_hole_not_connected",
      "Connect your rabbit hole account in Settings → Experiments.",
      400,
      rl,
    );
  if (error === "wrong_method")
    return apiError("method_not_allowed", "This resource uses a different HTTP method.", 405, rl);
  if (error === "upstream_auth")
    return apiError(
      "rabbit_hole_auth",
      "The stored rabbit hole token is invalid or expired.",
      401,
      rl,
    );
  return apiError("rabbit_hole_error", "rabbit hole request failed.", 502, rl);
}

// Both methods require a store API key with the 'rabbithole' scope, and return
// the key owner's own rabbit hole data. read mode is used for both so we get
// rate-limiting + key resolution; we enforce the scope ourselves.
async function authed(req: Request) {
  const g = await guard(req, { mode: "read" });
  if ("error" in g) return { err: g.error };
  const { key, rl } = g.ctx;
  if (!key)
    return {
      err: apiError(
        "auth_required",
        "This endpoint requires an API key with the 'rabbithole' scope.",
        401,
        rl,
      ),
    };
  if (!hasScope(key, "rabbithole"))
    return { err: apiError("forbidden", "API key lacks the 'rabbithole' scope.", 403, rl) };
  return { key, rl };
}

// GET /api/v1/rabbithole/[resource] — read resources.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const a = await authed(req);
  if ("err" in a) return a.err;
  const { key, rl } = a;

  const { resource } = await params;
  if (!isRabbitResource(resource))
    return apiError("not_found", "Unknown rabbit hole resource.", 404, rl);

  const url = new URL(req.url);
  const input: Record<string, unknown> = {};
  for (const k of ["days", "nDays", "maxResults"]) {
    const v = url.searchParams.get(k);
    if (v != null) input[k] = v;
  }

  const result = await callRabbitHole(key.userId, resource, input, "read");
  if (!result.ok) return mapError(result.error, rl);
  return json({ data: result.data }, { rl });
}

// POST /api/v1/rabbithole/[resource] — write resources (mutations).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const a = await authed(req);
  if ("err" in a) return a.err;
  const { key, rl } = a;

  const { resource } = await params;
  if (!isRabbitResource(resource))
    return apiError("not_found", "Unknown rabbit hole resource.", 404, rl);
  if (RH_SPECS[resource].kind !== "write")
    return apiError("method_not_allowed", "This resource is read-only; use GET.", 405, rl);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await callRabbitHole(key.userId, resource, body, "write");
  if (!result.ok) return mapError(result.error, rl);
  return json({ data: result.data }, { rl });
}
