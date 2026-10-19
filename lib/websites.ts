import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const websiteTag = (id: string) => `website-${id}`;

// The builder edits a single website per user: the first one they created.
export async function getUserWebsite(userId: string) {
  return prisma.website.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

// Cached for public visitors; invalidated via updateTag when the owner saves.
export async function getPublishedWebsite(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(websiteTag(id));

  return prisma.website.findFirst({
    where: { id, published: true },
  });
}
