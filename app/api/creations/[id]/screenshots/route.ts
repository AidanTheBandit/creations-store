import { NextRequest, NextResponse } from "next/server";
import { getCreationScreenshots, addScreenshot, setMainScreenshot, deleteScreenshot, getCreationById } from "@/lib/data";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creationId = Number(params.id);

    if (isNaN(creationId)) {
      return NextResponse.json({ error: "Invalid creation ID" }, { status: 400 });
    }

    const screenshots = await getCreationScreenshots(creationId);

    return NextResponse.json({ screenshots });
  } catch (error) {
    console.error("Error fetching screenshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch screenshots" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creationId = Number(params.id);

    if (isNaN(creationId)) {
      return NextResponse.json({ error: "Invalid creation ID" }, { status: 400 });
    }

    const body = await request.json();
    const { url, isMain } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Verify creation exists
    const creation = await getCreationById(creationId);
    if (!creation) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 });
    }

    const screenshot = await addScreenshot(creationId, url, isMain || false);

    return NextResponse.json({ success: true, screenshot });
  } catch (error) {
    console.error("Error adding screenshot:", error);
    return NextResponse.json(
      { error: "Failed to add screenshot" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creationId = Number(params.id);
    const body = await request.json();
    const { screenshotId } = body;

    if (!screenshotId) {
      return NextResponse.json({ error: "Screenshot ID is required" }, { status: 400 });
    }

    if (isNaN(creationId)) {
      return NextResponse.json({ error: "Invalid creation ID" }, { status: 400 });
    }

    await setMainScreenshot(Number(screenshotId), creationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting main screenshot:", error);
    return NextResponse.json(
      { error: "Failed to set main screenshot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { screenshotId } = body;

    if (!screenshotId) {
      return NextResponse.json({ error: "Screenshot ID is required" }, { status: 400 });
    }

    await deleteScreenshot(Number(screenshotId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting screenshot:", error);
    return NextResponse.json(
      { error: "Failed to delete screenshot" },
      { status: 500 }
    );
  }
}
