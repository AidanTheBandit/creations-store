import { db } from "../db/client";
import { categories } from "../db/schema";
import { eq } from "drizzle-orm";

const essentialCategories = [
  { name: "Games", slug: "games", description: "Games and entertainment" },
  {
    name: "Productivity",
    slug: "productivity",
    description: "Get things done",
  },
  { name: "Social", slug: "social", description: "Connect with others" },
  {
    name: "Entertainment",
    slug: "entertainment",
    description: "Entertainment apps",
  },
  { name: "Education", slug: "education", description: "Learn something new" },
  {
    name: "Photo & Video",
    slug: "photo-video",
    description: "Capture and edit media",
  },
  { name: "Music", slug: "music", description: "Music and audio" },
  { name: "Shopping", slug: "shopping", description: "Shop online" },
  { name: "Utilities", slug: "utilities", description: "Tools and utilities" },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    description: "Development tools",
  },
  { name: "Design", slug: "design", description: "Design and creativity" },
  { name: "Finance", slug: "finance", description: "Money management" },
];

async function generateDatabase() {
  console.log("🏗️  Generating database schema with essential categories...\n");

  // Add categories with colors and icons
  const categoryData = essentialCategories.map((category, index) => {
    const colors = [
      "#ef4444",
      "#22c55e",
      "#3b82f6",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#f97316",
      "#64748b",
      "#0ea5e9",
      "#f43f5e",
      "#10b981",
    ];
    const icons = [
      "🎮",
      "⚡",
      "👥",
      "🎬",
      "📚",
      "📸",
      "🎵",
      "🛒",
      "🔧",
      "💻",
      "🎨",
      "💰",
    ];

    return {
      id: category.slug,
      name: category.name,
      description: category.description,
      slug: category.slug,
      color: colors[index],
      icon: icons[index],
    };
  });

  console.log("Adding essential categories...\n");

  // Add new categories
  for (const category of categoryData) {
    try {
      // Check if category already exists
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.id, category.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⚠️  Category already exists: ${category.name}`);
        continue;
      }

      await db.insert(categories).values(category);
      console.log(`✓ Added: ${category.name}`);
    } catch (error) {
      console.log(`× Error adding ${category.name}:`, error);
    }
  }

  console.log("\n✅ Database generation complete!");
  console.log(`Added ${categoryData.length} categories.`);
  process.exit(0);
}

generateDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
