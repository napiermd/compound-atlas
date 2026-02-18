import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { db } from "@/lib/db";
import { StackGoal } from "@prisma/client";
import { slugify } from "@/lib/utils";

export const stackRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
        goal: z.nativeEnum(StackGoal).optional(),
        publicOnly: z.boolean().default(true),
        sortBy: z
          .enum(["newest", "evidenceScore", "upvotes"])
          .default("newest"),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, goal, publicOnly, sortBy } = input;
      const stacks = await db.stack.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          ...(publicOnly && { isPublic: true }),
          ...(goal && { goal }),
        },
        orderBy:
          sortBy === "evidenceScore"
            ? [
                { evidenceScore: { sort: "desc", nulls: "last" } },
                { createdAt: "desc" },
              ]
            : sortBy === "upvotes"
              ? [{ upvotes: "desc" }, { createdAt: "desc" }]
              : [{ createdAt: "desc" }],
        include: {
          creator: { select: { name: true, image: true } },
          compounds: {
            include: {
              compound: {
                select: { name: true, slug: true, category: true },
              },
            },
            take: 6,
          },
          _count: { select: { cycles: true, forks: true } },
        },
      });

      let nextCursor: string | undefined;
      if (stacks.length > limit) {
        nextCursor = stacks.pop()?.id;
      }
      return { stacks, nextCursor };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return db.stack.findUnique({
        where: { slug: input.slug },
        include: {
          creator: { select: { name: true, image: true } },
          compounds: {
            include: {
              compound: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  category: true,
                  legalStatus: true,
                  evidenceScore: true,
                  doseUnit: true,
                },
              },
            },
            orderBy: { startWeek: "asc" },
          },
          forks: {
            take: 5,
            orderBy: { upvotes: "desc" },
            include: { creator: { select: { name: true } } },
          },
          _count: { select: { cycles: true, forks: true } },
        },
      });
    }),

  getInteractions: publicProcedure
    .input(
      z.object({
        compoundIds: z.array(z.string()).min(2).max(30),
      })
    )
    .query(async ({ input }) => {
      const { compoundIds } = input;
      return db.compoundInteraction.findMany({
        where: {
          sourceCompoundId: { in: compoundIds },
          targetCompoundId: { in: compoundIds },
        },
        include: {
          source: { select: { name: true, slug: true } },
          target: { select: { name: true, slug: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        goal: z.nativeEnum(StackGoal),
        durationWeeks: z.number().int().positive().optional(),
        isPublic: z.boolean().default(false),
        compounds: z.array(
          z.object({
            compoundId: z.string(),
            dose: z.number().positive().optional(),
            unit: z.string().optional(),
            frequency: z.string().optional(),
            startWeek: z.number().int().nonnegative().optional(),
            endWeek: z.number().int().positive().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { compounds, ...stackData } = input;
      const baseSlug = slugify(stackData.name);
      const slug = `${baseSlug}-${Date.now()}`;

      // Compute composite evidence score from compound data
      let evidenceScore: number | null = null;
      if (compounds.length > 0) {
        const compoundIds = compounds.map((c) => c.compoundId);
        const compoundData = await db.compound.findMany({
          where: { id: { in: compoundIds } },
          select: { evidenceScore: true },
        });
        const scored = compoundData.filter((c) => c.evidenceScore != null);
        if (scored.length > 0) {
          evidenceScore =
            scored.reduce((sum, c) => sum + c.evidenceScore!, 0) /
            scored.length;
        }
      }

      return db.stack.create({
        data: {
          ...stackData,
          slug,
          evidenceScore,
          creatorId: ctx.session.user.id,
          compounds: { create: compounds },
        },
      });
    }),

  upvote: protectedProcedure
    .input(z.object({ stackId: z.string() }))
    .mutation(async ({ input }) => {
      return db.stack.update({
        where: { id: input.stackId },
        data: { upvotes: { increment: 1 } },
      });
    }),
});
