import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/admin/creations/[id] — admin set a creation's status.
// Body: { status: "draft" | "published" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (status !== "draft" && status !== "published") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("store_creations")
    .update({ status })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/creations/[id] — admin delete a creation.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin.from("store_creations").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return NextResponse.json({ success: true });
}
