import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // First time login - create or update user
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, profile.email as string),
        });

        // Discord profile structure:
        // - global_name: User's display name (what they want to be called)
        // - username: Their actual username (e.g., "username" without discriminator)
        // - name: Usually fallback to global_name or username
        const discordDisplayName = (profile as any).global_name || profile.name || "User";
        const discordUsername = (profile as any).username || null;
        const discordId = (profile as any).id;
        const ADMIN_DISCORD_ID = "592732401856282638";

        // Discord avatar URL needs to be constructed properly
        // Format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
        let discordAvatar: string | null = null;
        if (profile.image) {
          discordAvatar = profile.image as string;
        } else if ((profile as any).avatar && discordId) {
          // Fallback: construct the avatar URL manually
          discordAvatar = `https://cdn.discordapp.com/avatars/${discordId}/${(profile as any).avatar}.png`;
        }

        if (existingUser) {
          token.id = existingUser.id;
          token.isAdmin = existingUser.isAdmin || false;
          // Update user info on each login
          await db.update(users)
            .set({
              name: discordDisplayName,
              username: discordUsername,
              avatar: discordAvatar,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));
        } else {
          // Create new user
          const userId = crypto.randomUUID();
          const isAdmin = discordId === ADMIN_DISCORD_ID;
          await db.insert(users).values({
            id: userId,
            email: profile.email as string,
            name: discordDisplayName,
            username: discordUsername,
            avatar: discordAvatar,
            isAdmin,
            password: "", // Not needed for OAuth
          });
          token.id = userId;
          token.isAdmin = isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};
