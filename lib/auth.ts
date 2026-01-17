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

        const discordName = (profile as any).username || profile.name || "User";
        const discordId = (profile as any).id;
        const ADMIN_DISCORD_ID = "592732401856282638";

        if (existingUser) {
          token.id = existingUser.id;
          token.isAdmin = existingUser.isAdmin || false;
          // Update user info on each login
          await db.update(users)
            .set({
              name: discordName,
              avatar: profile.image as string || null,
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
            name: discordName,
            avatar: profile.image as string || null,
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
