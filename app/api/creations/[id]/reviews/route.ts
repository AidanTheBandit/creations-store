import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCreationReviews,
  createReview,
  getUserReviewForCreation,
  updateReview,
  deleteReview,
} from "@/lib/data";
import { db } from "@/db/client";
import { creations, creationReviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creationId = parseInt(id, 10);

    if (isNaN(creationId)) {
      return NextResponse.json({ error: "Invalid creation ID" }, { status: 400 });
    }

    // Verify creation exists
    const creation = await db
      .select()
      .from(creations)
      .where(eq(creations.id, creationId))
      .limit(1);

    if (creation.length === 0) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 });
    }

    const reviews = await getCreationReviews(creationId);

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const creationId = parseInt(id, 10);

    if (isNaN(creationId)) {
      return NextResponse.json({ error: "Invalid creation ID" }, { status: 400 });
    }

    // Verify creation exists
    const creation = await db
      .select()
      .from(creations)
      .where(eq(creations.id, creationId))
      .limit(1);

    if (creation.length === 0) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 });
    }

    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating
    if (
      typeof rating !== "number" ||
      rating < 1 ||
      rating > 5 ||
      !Number.isInteger(rating)
    ) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user already has a review
    const existingReview = await getUserReviewForCreation(
      creationId,
      session.user.id
    );

    let review;

    if (existingReview) {
      // Update existing review
      review = await updateReview(existingReview.id, rating, comment);
    } else {
      // Create new review
      review = await createReview(creationId, session.user.id, rating, comment);
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const creationId = parseInt(id, 10);

    if (isNaN(creationId)) {
      return NextResponse.json({ error: "Invalid creation ID" }, { status: 400 });
    }

    // Find and delete user's review for this creation
    const review = await db
      .select()
      .from(creationReviews)
      .where(
        and(
          eq(creationReviews.creationId, creationId),
          eq(creationReviews.userId, session.user.id)
        )
      )
      .limit(1);

    if (review.length === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await deleteReview(review[0].id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
