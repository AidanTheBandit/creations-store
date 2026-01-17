import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is admin
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const body = await request.json();
    const { suspend } = body;

    if (typeof suspend !== "boolean") {
      return NextResponse.json(
        { error: "Invalid suspend value" },
        { status: 400 }
      );
    }

    // Update user suspension status
    await db
      .update(users)
      .set({ isSuspended: suspend })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: suspend ? "User suspended" : "User unsuspended",
    });
  } catch (error) {
    console.error("Error updating user suspension:", error);
    return NextResponse.json(
      { error: "Failed to update user suspension" },
      { status: 500 }
    );
  }
}
