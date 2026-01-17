import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (images only)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Prepare FormData for catbox.moe
    const catboxFormData = new FormData();
    catboxFormData.append("reqtype", "fileupload");
    catboxFormData.append("fileToUpload", file);

    // Optional: Add userhash for album organization
    const userHash = process.env.CATBOX_USERHASH;
    if (userHash) {
      catboxFormData.append("userhash", userHash);
    }

    // Upload to catbox.moe with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: catboxFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Catbox.moe returned ${response.status}`);
      }

      // catbox.moe returns the URL as plain text
      const url = await response.text();

      if (!url || url.trim().length === 0) {
        throw new Error("Catbox.moe returned empty response");
      }

      return NextResponse.json({
        success: true,
        url: url.trim(),
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error("Upload timed out. Catbox.moe may be slow or unavailable.");
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Screenshot upload error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to upload screenshot. Please try again."
      },
      { status: 500 }
    );
  }
}
