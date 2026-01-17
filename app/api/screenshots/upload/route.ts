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

    // Validate file size (max 10MB - ImgBB limit is 32MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Get ImgBB API key
    const apiKey = process.env.IMG_BB_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error("IMG_BB_API_KEY is not set in environment variables");
      return NextResponse.json(
        {
          error: "ImgBB API key not configured. Please:\n1. Go to https://api.imgbb.com/\n2. Get a free API key\n3. Add IMG_BB_API_KEY=your_key to your .env file\n4. Restart the dev server"
        },
        { status: 500 }
      );
    }

    // Upload to ImgBB
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const imgbbFormData = new FormData();
      imgbbFormData.append("key", apiKey);
      imgbbFormData.append("image", base64);

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: imgbbFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ImgBB error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();

      console.log("ImgBB response:", result);

      if (!result.success) {
        throw new Error(result.error?.message || "ImgBB upload failed");
      }

      return NextResponse.json({
        success: true,
        url: result.data.url,
        display_url: result.data.display_url,
        delete_url: result.data.delete_url,
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error("Upload timed out. Please try again.");
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
