import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { creations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: { url: string } },
) {
  try {
    const decodedUrl = decodeURIComponent(params.url);

    await db.delete(creations).where(eq(creations.url, decodedUrl));

    return NextResponse.json({ message: "Creation deleted successfully" });
  } catch (error) {
    console.error("Error deleting creation:", error);
    return NextResponse.json(
      { error: "Failed to delete creation" },
      { status: 500 },
    );
  }
}
