import { db } from "../db/client";
import { categories } from "../db/schema";

const categoryData = [
  { name: "Design Tools", slug: "design-tools", description: "Tools for designers" },
  { name: "Development", slug: "development", description: "Programming and development tools" },
  { name: "Productivity", slug: "productivity", description: "Tools to boost productivity" },
  { name: "Marketing", slug: "marketing", description: "Marketing and advertising tools" },
  { name: "Writing", slug: "writing", description: "Writing and content creation tools" },
  { name: "Analytics", slug: "analytics", description: "Analytics and data tools" },
  { name: "Communication", slug: "communication", description: "Communication and collaboration tools" },
  { name: "Finance", slug: "finance", description: "Financial tools and services" },
  { name: "Education", slug: "education", description: "Learning and educational resources" },
  { name: "Entertainment", slug: "entertainment", description: "Entertainment and media" },
  { name: "Health & Fitness", slug: "health-fitness", description: "Health and wellness tools" },
  { name: "Photography", slug: "photography", description: "Photography and image editing tools" },
  { name: "Video", slug: "video", description: "Video editing and production tools" },
  { name: "Audio", slug: "audio", description: "Audio and music tools" },
  { name: "Social Media", slug: "social-media", description: "Social media management tools" },
  { name: "E-commerce", slug: "ecommerce", description: "Online store and e-commerce tools" },
  { name: "Project Management", slug: "project-management", description: "Project management tools" },
  { name: "CRM", slug: "crm", description: "Customer relationship management" },
  { name: "Automation", slug: "automation", description: "Automation and workflow tools" },
  { name: "Security", slug: "security", description: "Security and privacy tools" },
  { name: "Cloud Services", slug: "cloud-services", description: "Cloud computing and storage" },
  { name: "Mobile Apps", slug: "mobile-apps", description: "Mobile applications" },
  { name: "Browser Extensions", slug: "browser-extensions", description: "Browser extensions and add-ons" },
  { name: "AI & Machine Learning", slug: "ai-machine-learning", description: "AI and ML tools" },
  { name: "Templates", slug: "templates", description: "Design and code templates" },
  { name: "Icons & Graphics", slug: "icons-graphics", description: "Icons, illustrations, and graphics" },
  { name: "Fonts", slug: "fonts", description: "Typography and font resources" },
  { name: "UI Kits", slug: "ui-kits", description: "UI design kits and components" },
  { name: "Code Snippets", slug: "code-snippets", description: "Code snippets and libraries" },
  { name: "Tutorials", slug: "tutorials", description: "Learning tutorials and guides" },
];

async function seedCategories() {
  console.log("Seeding categories...");

  for (const category of categoryData) {
    try {
      await db.insert(categories).values({
        id: crypto.randomUUID(),
        ...category,
      });
      console.log(`✓ Added category: ${category.name}`);
    } catch (error) {
      console.log(`× Category already exists or error: ${category.name}`);
    }
  }

  console.log("Done!");
  process.exit(0);
}

seedCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
