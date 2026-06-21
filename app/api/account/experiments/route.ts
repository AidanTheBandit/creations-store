import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExperimentFlags, setExperimentFlags } from "@/lib/experiments";
import { sameOrigin } from "@/lib/api/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Session-authed (dashboard settings). Returns only booleans — never the token.
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const flags = await getExperimentFlags(user.id);
  return NextResponse.json(flags);
}

// Toggle the boolean experiment flags.
export async function PATCH(req: NextRequest) {
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

  await setExperimentFlags(user.id, {
    rabbitRepoEnabled:
      typeof body.rabbitRepoEnabled === "boolean" ? body.rabbitRepoEnabled : undefined,
    rabbitHoleEnabled:
      typeof body.rabbitHoleEnabled === "boolean" ? body.rabbitHoleEnabled : undefined,
  });

  return NextResponse.json(await getExperimentFlags(user.id));
}
