import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { createWebsiteForUser } from "@/lib/websites";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        // Provision the new user's tenant website right away.
        after: async (user) => {
          await createWebsiteForUser(user);
        },
      },
    },
  },
  // Lets auth.api calls in Server Actions set the session cookie.
  plugins: [nextCookies()],
});
