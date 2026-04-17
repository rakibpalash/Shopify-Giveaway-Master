import prisma from "~/db.server";

export type GiveawayStatus = "draft" | "active" | "ended" | "cancelled";

export interface GiveawayInput {
  title: string;
  description?: string;
  prize: string;
  startDate: Date;
  endDate: Date;
  status?: GiveawayStatus;
}

export interface GiveawayUpdateInput extends Partial<GiveawayInput> {
  status?: GiveawayStatus;
  winnerId?: string | null;
}

export async function getGiveaways(shop: string, status?: GiveawayStatus) {
  return prisma.giveaway.findMany({
    where: { shop, ...(status ? { status } : {}) },
    include: { _count: { select: { entries: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGiveaway(id: string, shop: string) {
  return prisma.giveaway.findFirst({
    where: { id, shop },
    include: {
      _count: { select: { entries: true } },
    },
  });
}

export async function createGiveaway(shop: string, data: GiveawayInput) {
  return prisma.giveaway.create({
    data: { ...data, shop, status: data.status ?? "draft" },
  });
}

export async function updateGiveaway(
  id: string,
  shop: string,
  data: GiveawayUpdateInput,
) {
  return prisma.giveaway.update({ where: { id }, data });
}

export async function deleteGiveaway(id: string, shop: string) {
  await prisma.giveaway.findFirstOrThrow({ where: { id, shop } });
  return prisma.giveaway.delete({ where: { id } });
}

export async function getDashboardStats(shop: string) {
  const [totalGiveaways, activeGiveaways, totalEntries, winnersAnnounced] =
    await Promise.all([
      prisma.giveaway.count({ where: { shop } }),
      prisma.giveaway.count({ where: { shop, status: "active" } }),
      prisma.entry.count({ where: { giveaway: { shop } } }),
      prisma.giveaway.count({ where: { shop, NOT: { winnerId: null } } }),
    ]);
  return { totalGiveaways, activeGiveaways, totalEntries, winnersAnnounced };
}

export async function pickWinner(giveawayId: string, shop: string) {
  const giveaway = await prisma.giveaway.findFirstOrThrow({
    where: { id: giveawayId, shop, status: "active" },
    include: { entries: { select: { id: true } } },
  });

  if (giveaway.entries.length === 0) {
    throw new Error("No entries to pick a winner from");
  }

  const winner =
    giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];

  return prisma.giveaway.update({
    where: { id: giveawayId },
    data: { winnerId: winner.id, status: "ended" },
  });
}

export async function getWinnerEntry(giveaway: { winnerId: string | null }) {
  if (!giveaway.winnerId) return null;
  return prisma.entry.findUnique({ where: { id: giveaway.winnerId } });
}
