"use server";

import { db } from "@/db/client";
import { creations, categories, users } from "@/db/schema";
import { generateSlug } from "@/lib/utils";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: any;
  progress?: {
    current: number;
    total: number;
    currentUrl?: string;
    lastAdded?: string;
  };
};

type CreationData = {
  title: string;
  description: string;
  url: string;
  overview: string;
  search_results: string;
  iconUrl: string;
  ogImage: string;
  slug: string;
  themeColor: string;
  author: string;
  screenshotUrl: string;
  categoryId: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// User Actions
export async function registerUser(
  prevState: ActionState | null,
  formData: { email: string; password: string; name: string },
): Promise<ActionState> {
  try {
    const { email, password, name } = formData;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return { error: "User already exists" };
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
      name,
    });

    return { success: true, data: { userId } };
  } catch (error) {
    console.error("Error registering user:", error);
    return { error: "Failed to register user" };
  }
}

export async function updateUserProfile(
  prevState: ActionState | null,
  formData: { userId: string; name: string; bio: string; avatar: string },
): Promise<ActionState> {
  try {
    const { userId, name, bio, avatar } = formData;

    await db
      .update(users)
      .set({
        name,
        bio,
        avatar,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}

// Category Actions
export async function createCategory(
  prevState: ActionState | null,
  formData: {
    name: string;
    description: string;
    slug: string;
    color: string;
    icon: string;
  },
): Promise<ActionState> {
  try {
    const name = formData.name;
    const description = formData.description;
    const slug = formData.slug;
    const color = formData.color;
    const icon = formData.icon;
    const id = slug; // Using slug as the ID since it's unique

    await db.insert(categories).values({
      id,
      name,
      description,
      slug,
      color,
      icon,
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("Error creating category:", err);
    return { error: "Failed to create category" };
  }
}

export async function updateCategory(
  prevState: ActionState | null,
  formData: {
    id: string;
    name: string;
    description: string;
    slug: string;
    color: string;
    icon: string;
  },
): Promise<ActionState> {
  try {
    if (!formData) {
      return { error: "No form data provided" };
    }

    const id = formData.id;
    if (!id) {
      return { error: "No category ID provided" };
    }

    const name = formData.name;
    const description = formData.description;
    const slug = formData.slug;
    const color = formData.color;
    const icon = formData.icon;

    await db
      .update(categories)
      .set({
        name,
        description,
        slug,
        color,
        icon,
      })
      .where(eq(categories.id, id));

    revalidatePath("/admin");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("Error updating category:", err);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(
  prevState: ActionState | null,
  formData: {
    id: string;
  },
): Promise<ActionState> {
  try {
    if (!formData) {
      return { error: "No form data provided" };
    }

    const id = formData.id;
    if (!id) {
      return { error: "No category ID provided" };
    }

    await db.delete(categories).where(eq(categories.id, id));

    revalidatePath("/admin");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("Error deleting category:", err);
    return { error: "Failed to delete category" };
  }
}

// Creation Actions
export async function createCreation(
  prevState: ActionState | null,
  formData: {
    title: string;
    description: string;
    url: string;
    slug: string;
    overview: string;
    iconUrl: string;
    ogImage: string;
    search_results: string;
    themeColor: string;
    author: string;
    screenshotUrl: string;
    categoryId: string;
    isFavorite: string;
    isArchived: string;
    userId: string;
    status?: "draft" | "published";
  },
): Promise<ActionState> {
  try {
    const title = formData.title;
    const description = formData.description;
    const url = formData.url;
    let slug = formData.slug;
    const overview = formData.overview;
    const iconUrl = formData.iconUrl;
    const ogImage = formData.ogImage;
    const search_results = formData.search_results;
    const themeColor = formData.themeColor;
    const author = formData.author;
    const screenshotUrl = formData.screenshotUrl;
    const categoryId = formData.categoryId;
    const isFavorite = formData.isFavorite === "true";
    const isArchived = formData.isArchived === "true";
    const userId = formData.userId;
    const status = formData.status || "draft";

    // Generate slug if not provided
    if (!slug) {
      slug = generateSlug(title);
    }

    await db.insert(creations).values({
      title,
      slug,
      url,
      description,
      categoryId: categoryId === "none" ? null : categoryId,
      search_results: search_results || null,
      isFavorite,
      isArchived,
      overview,
      iconUrl,
      ogImage,
      themeColor,
      author,
      screenshotUrl,
      userId,
      status,
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("Error creating creation:", err);
    return { error: "Failed to create creation" };
  }
}

export async function updateCreation(
  prevState: ActionState | null,
  formData: {
    id: string;
    title: string;
    description: string;
    url: string;
    slug: string;
    overview: string;
    iconUrl: string;
    ogImage: string;
    search_results: string;
    themeColor: string;
    author: string;
    screenshotUrl: string;
    categoryId: string;
    isFavorite: string;
    isArchived: string;
    userId: string;
  },
): Promise<ActionState> {
  try {
    if (!formData) {
      return { error: "No form data provided" };
    }

    const id = formData.id;
    if (!id) {
      return { error: "No creation ID provided" };
    }

    // Check ownership
    const creation = await db.query.creations.findFirst({
      where: eq(creations.id, Number(id)),
    });

    if (!creation) {
      return { error: "Creation not found" };
    }

    if (creation.userId !== formData.userId) {
      return { error: "Unauthorized" };
    }

    const title = formData.title;
    const description = formData.description;
    const url = formData.url;
    let slug = formData.slug;
    const overview = formData.overview;
    const iconUrl = formData.iconUrl;
    const ogImage = formData.ogImage;
    const search_results = formData.search_results;
    const themeColor = formData.themeColor;
    const author = formData.author;
    const screenshotUrl = formData.screenshotUrl;
    const categoryId = formData.categoryId;
    const isFavorite = formData.isFavorite === "true";
    const isArchived = formData.isArchived === "true";

    // Generate slug if not provided
    if (!slug) {
      slug = generateSlug(title);
    }

    await db
      .update(creations)
      .set({
        title,
        slug,
        url,
        description,
        categoryId: categoryId === "none" ? null : categoryId,
        search_results: search_results || null,
        overview,
        iconUrl,
        ogImage,
        themeColor,
        author,
        screenshotUrl,
        isFavorite,
        isArchived,
      })
      .where(eq(creations.id, Number(id)));

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("Error updating creation:", err);
    return { error: "Failed to update creation" };
  }
}

export async function publishCreation(
  prevState: ActionState | null,
  formData: { id: string; userId: string },
): Promise<ActionState> {
  try {
    const creation = await db.query.creations.findFirst({
      where: eq(creations.id, Number(formData.id)),
    });

    if (!creation || creation.userId !== formData.userId) {
      return { error: "Unauthorized" };
    }

    await db
      .update(creations)
      .set({ status: "published" })
      .where(eq(creations.id, Number(formData.id)));

    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error publishing creation:", error);
    return { error: "Failed to publish creation" };
  }
}

export async function deleteCreation(
  prevState: ActionState | null,
  formData: {
    id: string;
    url: string;
    userId: string;
  },
): Promise<ActionState> {
  try {
    if (!formData) {
      return { error: "No form data provided" };
    }

    const id = formData.id;
    if (!id) {
      return { error: "No creation ID provided" };
    }

    // Check ownership
    const creation = await db.query.creations.findFirst({
      where: eq(creations.id, Number(id)),
    });

    if (!creation) {
      return { error: "Creation not found" };
    }

    if (creation.userId !== formData.userId) {
      return { error: "Unauthorized" };
    }

    const url = formData.url;

    await db.delete(creations).where(eq(creations.id, Number(id)));

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/${encodeURIComponent(url)}`);

    return { success: true };
  } catch (err) {
    console.error("Error deleting creation:", err);
    return { error: "Failed to delete creation" };
  }
}

// Helper function to handle errors
type ErrorResponse = {
  message: string;
  status: number;
};

export async function handleError(
  error: Error | ErrorResponse,
): Promise<{ message: string }> {
  if (error instanceof Error) {
    return { message: error.message };
  } else {
    return { message: error.message };
  }
}

export async function bulkUploadCreations(
  prevState: ActionState | null,
  formData: {
    urls: string;
  },
): Promise<ActionState> {
  try {
    const urls = formData.urls;
    if (!urls) {
      return { error: "No URLs provided" };
    }

    const urlList = urls.split("\n").filter((url) => url.trim());
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i].trim();
      if (!url) continue;

      try {
        const content = await generateContent(url);
        if (content.error) {
          errorCount++;
          continue;
        }

        // Create creation data with proper types
        const creationData: CreationData = {
          title: content.title,
          description: content.description,
          url: content.url,
          overview: content.overview,
          search_results: content.search_results,
          iconUrl: content.iconUrl,
          ogImage: content.ogImage,
          slug: content.slug,
          themeColor: "",
          author: "",
          screenshotUrl: "",
          categoryId: null,
          isFavorite: false,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(creations).values(creationData);

        successCount++;
        revalidatePath("/admin");
        revalidatePath("/[slug]");

        // Return progress update
        return {
          success: true,
          progress: {
            current: i + 1,
            total: urlList.length,
            lastAdded: content.title,
          },
        };
      } catch (error) {
        errorCount++;
        console.error(`Error processing URL ${url}:`, error);
      }
    }

    return {
      success: true,
      message: `Successfully imported ${successCount} creations. ${errorCount > 0 ? `Failed to import ${errorCount} URLs.` : ""}`,
      progress: {
        current: urlList.length,
        total: urlList.length,
      },
    };
  } catch (error) {
    console.error("Error in bulk upload:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process bulk upload",
    };
  }
}

// Screenshot Management Actions
export async function addScreenshotToCreation(
  prevState: ActionState | null,
  formData: {
    creationId: string;
    url: string;
    isMain: string;
    userId: string;
  },
): Promise<ActionState> {
  try {
    const creationId = Number(formData.creationId);
    const url = formData.url;
    const isMain = formData.isMain === "true";

    // Check ownership
    const creation = await db.query.creations.findFirst({
      where: eq(creations.id, creationId),
    });

    if (!creation || creation.userId !== formData.userId) {
      return { error: "Unauthorized" };
    }

    // If setting as main, first unset existing main
    if (isMain) {
      const { creationScreenshots } = await import("@/db/schema");
      await db
        .update(creationScreenshots)
        .set({ isMain: false })
        .where(eq(creationScreenshots.creationId, creationId));
    }

    // Add screenshot
    const { creationScreenshots } = await import("@/db/schema");
    const result = await db
      .insert(creationScreenshots)
      .values({
        creationId,
        url,
        isMain,
      })
      .returning();

    // Also update the creation's screenshotUrl if this is the main one
    if (isMain && result[0]) {
      await db
        .update(creations)
        .set({ screenshotUrl: result[0].url })
        .where(eq(creations.id, creationId));
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/edit/${creationId}`);

    return { success: true };
  } catch (error) {
    console.error("Error adding screenshot:", error);
    return { error: "Failed to add screenshot" };
  }
}

export async function setMainScreenshot(
  prevState: ActionState | null,
  formData: {
    screenshotId: string;
    creationId: string;
    userId: string;
  },
): Promise<ActionState> {
  try {
    const screenshotId = Number(formData.screenshotId);
    const creationId = Number(formData.creationId);

    // Check ownership
    const creation = await db.query.creations.findFirst({
      where: eq(creations.id, creationId),
    });

    if (!creation || creation.userId !== formData.userId) {
      return { error: "Unauthorized" };
    }

    // Unset all main screenshots for this creation
    const { creationScreenshots } = await import("@/db/schema");
    await db
      .update(creationScreenshots)
      .set({ isMain: false })
      .where(eq(creationScreenshots.creationId, creationId));

    // Set the new main screenshot
    await db
      .update(creationScreenshots)
      .set({ isMain: true })
      .where(eq(creationScreenshots.id, screenshotId));

    // Get the screenshot URL
    const screenshot = await db
      .select()
      .from(creationScreenshots)
      .where(eq(creationScreenshots.id, screenshotId))
      .limit(1);

    // Update the creation's screenshotUrl
    if (screenshot[0]) {
      await db
        .update(creations)
        .set({ screenshotUrl: screenshot[0].url })
        .where(eq(creations.id, creationId));
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/edit/${creationId}`);

    return { success: true };
  } catch (error) {
    console.error("Error setting main screenshot:", error);
    return { error: "Failed to set main screenshot" };
  }
}

export async function removeScreenshot(
  prevState: ActionState | null,
  formData: {
    screenshotId: string;
    creationId: string;
    userId: string;
  },
): Promise<ActionState> {
  try {
    const screenshotId = Number(formData.screenshotId);
    const creationId = Number(formData.creationId);

    // Check ownership
    const creation = await db.query.creations.findFirst({
      where: eq(creations.id, creationId),
    });

    if (!creation || creation.userId !== formData.userId) {
      return { error: "Unauthorized" };
    }

    // Delete the screenshot
    const { creationScreenshots } = await import("@/db/schema");
    await db
      .delete(creationScreenshots)
      .where(eq(creationScreenshots.id, screenshotId));

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/edit/${creationId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing screenshot:", error);
    return { error: "Failed to remove screenshot" };
  }
}

// URL Scraping Action
export async function scrapeUrl(
  prevState: ActionState | null,
  formData: {
    url: string;
  },
): Promise<ActionState> {
  try {
    const url = formData.url;
    if (!url) return { error: "URL is required" };

    // Get metadata from our API
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "";

    const metadataResponse = await fetch(
      `${baseUrl}/api/metadata?url=${encodeURIComponent(url)}`,
      {
        method: "GET",
      },
    );

    if (!metadataResponse.ok) {
      throw new Error("Failed to fetch metadata");
    }

    const metadata = await metadataResponse.json();

    return {
      success: true,
      data: {
        title: metadata.title || "",
        description: metadata.description || "",
        iconUrl: metadata.favicon || "",
        ogImage: metadata.ogImage || "",
        url: metadata.url || url,
      },
    };
  } catch (error) {
    console.error("Error scraping URL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scrape URL",
    };
  }
}

// Legacy function aliases for backward compatibility
export const createBookmark = createCreation;
export const updateBookmark = updateCreation;
export const publishBookmark = publishCreation;
export const deleteBookmark = deleteCreation;
export const bulkUploadBookmarks = bulkUploadCreations;
