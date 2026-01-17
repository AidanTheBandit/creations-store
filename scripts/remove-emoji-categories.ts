import { db } from "../db/client";
import { categories } from "../db/schema";

async function removeEmojis() {
  console.log("Removing emojis from categories...");

  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    if (category.icon && /[\u2600-\u27BF\uE000-\uF8FF\U0001F300-\U0001F9FF]/.test(category.icon)) {
      await db
        .update(categories)
        .set({ icon: null })
        .where(eq(categories.id, category.id));
      console.log(`✓ Removed emoji from: ${category.name}`);
    }
  }

  console.log("Done!");
  process.exit(0);
}

import { eq } from "drizzle-orm";
removeEmojis().catch((error) => {
  console.error(error);
  process.exit(1);
});
