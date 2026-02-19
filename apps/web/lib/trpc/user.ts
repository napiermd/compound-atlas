import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./trpc";
import { db } from "@/lib/db";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        weightUnit: true,
        tempUnit: true,
        createdAt: true,
        _count: { select: { stacks: true, cycles: true } },
      },
    });
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        weightUnit: z.enum(["lbs", "kg"]).optional(),
        tempUnit: z.enum(["F", "C"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: { id: true, weightUnit: true, tempUnit: true },
      });
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    // Soft delete
    return db.user.update({
      where: { id: ctx.session.user.id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }),

  publicProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.userId, deletedAt: null },
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
          stacks: {
            where: { isPublic: true },
            orderBy: { upvotes: "desc" },
            take: 50,
            include: {
              creator: { select: { name: true, image: true } },
              compounds: {
                include: {
                  compound: { select: { name: true, slug: true, category: true } },
                },
                take: 6,
              },
              _count: { select: { cycles: true, forks: true } },
            },
          },
        },
      });

      if (!user) return null;

      const totalUpvotes = user.stacks.reduce((sum, s) => sum + s.upvotes, 0);
      const compoundSlugs = new Set(
        user.stacks.flatMap((s) => s.compounds.map((c) => c.compound.slug))
      );

      return {
        ...user,
        totalUpvotes,
        uniqueCompoundCount: compoundSlugs.size,
      };
    }),
});
