import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { db } from "@/lib/db";
import { CompoundCategory } from "@prisma/client";
import { getStaleThresholdDays, isCompoundStale } from "@/lib/compound-freshness";
import { scoreCommunityAnalytics } from "@/lib/community-analytics";

export const compoundRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(24),
        cursor: z.string().nullish(),
        category: z.nativeEnum(CompoundCategory).optional(),
        search: z.string().optional(),
        sortBy: z
          .enum(["name", "evidenceScore", "studyCount"])
          .default("evidenceScore"),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, category, search, sortBy } = input;
      const compounds = await db.compound.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          ...(category && { category }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }),
        },
        orderBy:
          sortBy === "name"
            ? { name: "asc" }
            : sortBy === "studyCount"
              ? { studyCount: "desc" }
              : { evidenceScore: "desc" },
      });

      let nextCursor: string | undefined;
      if (compounds.length > limit) {
        nextCursor = compounds.pop()?.id;
      }

      const staleThresholdDays = getStaleThresholdDays();
      const enriched = compounds.map((compound) => ({
        ...compound,
        isStale: isCompoundStale(compound.lastResearchSync),
      }));

      return { compounds: enriched, nextCursor, staleThresholdDays };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const compound = await db.compound.findUnique({
        where: { slug: input.slug },
        include: {
          sideEffects: true,
          mechanisms: true,
          interactions: {
            include: {
              target: { select: { name: true, slug: true, category: true } },
            },
          },
          studies: {
            include: { study: true },
            take: 10,
          },
          outcomes: {
            take: 20,
            orderBy: { metric: "asc" },
          },
        },
      });

      if (!compound) return null;
      const staleThresholdDays = getStaleThresholdDays();
      return {
        ...compound,
        isStale: isCompoundStale(compound.lastResearchSync),
        staleThresholdDays,
      };
    }),

  communityAnalytics: publicProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            compounds: z.array(z.string().min(1)).min(1),
            goalContext: z.string().min(1),
            mentionedAt: z.string().datetime(),
            confidence: z.number().min(0).max(1).optional(),
          })
        ),
        windowDays: z.number().int().min(7).max(180).default(30),
        staleThresholdDays: z.number().int().min(1).max(3650).optional(),
      })
    )
    .query(({ input }) => {
      return scoreCommunityAnalytics(input.events, {
        windowDays: input.windowDays,
        staleThresholdDays: input.staleThresholdDays,
        now: new Date(),
      });
    }),

  categories: publicProcedure.query(async () => {
    const results = await db.compound.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    });
    return results.map((r) => ({ category: r.category, count: r._count._all }));
  }),
});
