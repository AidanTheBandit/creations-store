import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getExperimentFlags,
  setRabbitHoleToken,
  clearRabbitHoleToken,
} from "@/lib/experiments";
import { sameOrigin } from "@/lib/api/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Store the rabbit hole appSession token (encrypted at rest). The token is
// accepted here, sealed immediately, and never echoed back to any client.
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 422 });
  if (token.length > 8192)
    return NextResponse.json({ error: "token_too_long" }, { status: 422 });

  try {
    await setRabbitHoleToken(user.id, token);
  } catch (e) {
    // Most likely RABBIT_HOLE_TOKEN_SECRET is unset/misconfigured.
    console.error("[experiments/rabbit-hole-token] seal failed:", e);
    return NextResponse.json({ error: "encryption_unavailable" }, { status: 500 });
  }

  return NextResponse.json(await getExperimentFlags(user.id));
}

// Remove the stored token.
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await clearRabbitHoleToken(user.id);
  return NextResponse.json(await getExperimentFlags(user.id));
}
