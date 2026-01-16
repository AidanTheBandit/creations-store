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
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // First time login - create or update user
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, profile.email as string),
        });

        if (existingUser) {
          token.id = existingUser.id;
        } else {
          // Create new user
          const userId = crypto.randomUUID();
          await db.insert(users).values({
            id: userId,
            email: profile.email as string,
            name: profile.name as string,
            avatar: profile.image as string,
            password: "", // Not needed for OAuth
          });
          token.id = userId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
