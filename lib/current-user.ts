import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

// Placeholder until real authentication is added. Every request acts as
// this demo user, so swapping in an auth provider only touches this file.
const DEMO_USER = {
  email: "demo@example.com",
  name: "Demo User",
};

export async function getCurrentUser() {
  // The current user is request-specific; never resolve it during prerender.
  // A real session lookup via cookies() would make this implicit.
  await connection();

  return prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: DEMO_USER,
  });
}
