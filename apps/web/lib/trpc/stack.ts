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
    .query(async ({ input, ctx }) => {
      const stack = await db.stack.findUnique({
        where: { slug: input.slug },
        include: {
          creator: { select: { id: true, name: true, image: true } },
          forkedFrom: { select: { name: true, slug: true } },
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

      if (!stack) return null;

      const userHasUpvoted = ctx.session?.user?.id
        ? !!(await db.stackUpvote.findUnique({
            where: {
              userId_stackId: {
                userId: ctx.session.user.id,
                stackId: stack.id,
              },
            },
          }))
        : false;

      return { ...stack, userHasUpvoted };
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

  // Toggle upvote (add or remove)
  upvote: protectedProcedure
    .input(z.object({ stackId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { stackId } = input;

      const existing = await db.stackUpvote.findUnique({
        where: { userId_stackId: { userId, stackId } },
      });

      if (existing) {
        await db.stackUpvote.delete({ where: { id: existing.id } });
        return db.stack.update({
          where: { id: stackId },
          data: { upvotes: { decrement: 1 } },
          select: { id: true, upvotes: true },
        });
      } else {
        await db.stackUpvote.create({ data: { userId, stackId } });
        return db.stack.update({
          where: { id: stackId },
          data: { upvotes: { increment: 1 } },
          select: { id: true, upvotes: true },
        });
      }
    }),

  // Fork a stack
  fork: protectedProcedure
    .input(z.object({ stackId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const original = await db.stack.findUniqueOrThrow({
        where: { id: input.stackId },
        include: { compounds: true },
      });

      const newName = `${original.name} (Fork)`;
      const slug = `${slugify(newName)}-${Date.now()}`;

      // Increment forkCount on original
      await db.stack.update({
        where: { id: input.stackId },
        data: { forkCount: { increment: 1 } },
      });

      return db.stack.create({
        data: {
          name: newName,
          slug,
          description: original.description,
          goal: original.goal,
          durationWeeks: original.durationWeeks,
          isPublic: false,
          evidenceScore: original.evidenceScore,
          forkedFromId: input.stackId,
          creatorId: userId,
          compounds: {
            create: original.compounds.map(
              ({ id: _id, stackId: _sid, ...rest }) => rest
            ),
          },
        },
      });
    }),
});
