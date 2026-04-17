import prisma from "~/db.server";

export interface EntryInput {
  giveawayId: string;
  customerEmail: string;
  customerName: string;
  entryMethod?: string;
  ipAddress?: string;
}

export async function createEntry(data: EntryInput) {
  const giveaway = await prisma.giveaway.findFirst({
    where: {
      id: data.giveawayId,
      status: "active",
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  });

  if (!giveaway) {
    throw new Error("This giveaway is not currently active");
  }

  const existing = await prisma.entry.findUnique({
    where: {
      giveawayId_customerEmail: {
        giveawayId: data.giveawayId,
        customerEmail: data.customerEmail.toLowerCase(),
      },
    },
  });

  if (existing) {
    throw new Error("You have already entered this giveaway");
  }

  return prisma.entry.create({
    data: {
      ...data,
      customerEmail: data.customerEmail.toLowerCase(),
      entryMethod: data.entryMethod ?? "form",
    },
  });
}

export async function getEntriesByGiveaway(
  giveawayId: string,
  page = 1,
  pageSize = 50,
) {
  const skip = (page - 1) * pageSize;
  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where: { giveawayId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.entry.count({ where: { giveawayId } }),
  ]);
  return { entries, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getEntryCount(giveawayId: string) {
  return prisma.entry.count({ where: { giveawayId } });
}

export async function exportEntriesCSV(giveawayId: string): Promise<string> {
  const entries = await prisma.entry.findMany({
    where: { giveawayId },
    orderBy: { createdAt: "desc" },
  });

  const header = "Name,Email,Entry Method,Date\n";
  const rows = entries
    .map(
      (e) =>
        `"${e.customerName}","${e.customerEmail}","${e.entryMethod}","${e.createdAt.toISOString()}"`,
    )
    .join("\n");

  return header + rows;
}
