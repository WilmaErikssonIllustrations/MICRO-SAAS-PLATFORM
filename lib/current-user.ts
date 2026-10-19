import "server-only";
import { prisma } from "@/lib/prisma";

// Placeholder until real authentication is added. Every request acts as
// this demo user, so swapping in an auth provider only touches this file.
const DEMO_USER = {
  email: "demo@example.com",
  name: "Demo User",
};

export async function getCurrentUser() {
  return prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: DEMO_USER,
  });
}
