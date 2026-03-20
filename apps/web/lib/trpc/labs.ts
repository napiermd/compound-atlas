import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "@/lib/db";

export const labsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        marker: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.labResult.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.marker && { marker: input.marker }),
        },
        orderBy: { testedAt: "desc" },
        take: input.limit,
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        marker: z.string().trim().min(1),
        value: z.number(),
        unit: z.string().trim().min(1),
        refRangeLow: z.number().optional(),
        refRangeHigh: z.number().optional(),
        testedAt: z.date(),
        labName: z.string().trim().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.labResult.create({
        data: { userId: ctx.session.user.id, ...input },
      });
    }),

  createBatch: protectedProcedure
    .input(
      z.array(
        z.object({
          marker: z.string().trim().min(1),
          value: z.number(),
          unit: z.string().trim().min(1),
          refRangeLow: z.number().optional(),
          refRangeHigh: z.number().optional(),
          testedAt: z.date(),
          labName: z.string().trim().optional(),
          notes: z.string().optional(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return db.labResult.createMany({
        data: input.map((lab) => ({ userId, ...lab })),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return db.labResult.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});
