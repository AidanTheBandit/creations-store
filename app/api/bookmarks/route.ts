import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { creations } from "@/db/schema";

export async function GET() {
  try {
    const allCreations = await db.select().from(creations);
    return NextResponse.json(allCreations);
  } catch (error) {
    console.error("Error fetching creations:", error);
    return NextResponse.json(
      { error: "Failed to fetch creations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Insert the new creation
    await db.insert(creations).values({
      url: body.url,
      title: body.title,
      slug: body.slug,
      description: body.description || null,
      categoryId: body.categoryId || null,
      overview: body.overview || null,
      favicon: body.favicon || null,
      screenshot: body.screenshot || null,
      ogImage: body.ogImage || null,
      ogTitle: body.ogTitle || null,
      ogDescription: body.ogDescription || null,
      notes: body.notes || null,
      tags: body.tags || null,
      isArchived: body.isArchived || false,
      isFavorite: body.isFavorite || false,
      search_results: body.search_results || null,
      iconUrl: body.iconUrl || null,
      themeColor: body.themeColor || null,
      author: body.author || null,
      screenshotUrl: body.screenshotUrl || null,
    });

    return NextResponse.json(
      { message: "Creation created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating creation:", error);
    return NextResponse.json(
      { error: "Failed to create creation" },
      { status: 500 },
    );
  }
}
