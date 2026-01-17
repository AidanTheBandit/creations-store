import { db } from "../db/client";
import { categories, creations } from "../db/schema";
import { eq } from "drizzle-orm";

const essentialCategories = [
  { name: "Games", slug: "games", description: "Games and entertainment" },
  { name: "Productivity", slug: "productivity", description: "Get things done" },
  { name: "Social", slug: "social", description: "Connect with others" },
  { name: "Entertainment", slug: "entertainment", description: "Entertainment apps" },
  { name: "Education", slug: "education", description: "Learn something new" },
  { name: "Photo & Video", slug: "photo-video", description: "Capture and edit media" },
  { name: "Music", slug: "music", description: "Music and audio" },
  { name: "Shopping", slug: "shopping", description: "Shop online" },
  { name: "Utilities", slug: "utilities", description: "Tools and utilities" },
  { name: "Developer Tools", slug: "developer-tools", description: "Development tools" },
  { name: "Design", slug: "design", description: "Design and creativity" },
  { name: "Finance", slug: "finance", description: "Money management" },
];

async function updateCategories() {
  console.log("Updating categories to essential App Store categories...\n");

  // First, unlink all bookmarks from categories
  console.log("Unlinking bookmarks from categories...");
  await db.update(creations).set({ categoryId: null });

  // Delete all existing categories
  const allCategories = await db.select().from(categories);
  console.log(`Deleting ${allCategories.length} existing categories...`);

  for (const category of allCategories) {
    await db.delete(categories).where(eq(categories.id, category.id));
  }

  console.log("Adding new categories...\n");

  // Add new categories
  for (const category of essentialCategories) {
    try {
      await db.insert(categories).values({
        id: crypto.randomUUID(),
        ...category,
      });
      console.log(`✓ Added: ${category.name}`);
    } catch (error) {
      console.log(`× Error adding ${category.name}:`, error);
    }
  }

  console.log("\nDone!");
  console.log(`Added ${essentialCategories.length} categories.`);
  process.exit(0);
}

updateCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
