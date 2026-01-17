import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/data";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    // Check if user is admin
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
