import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "@/lib/db";
import { CycleStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const cycleRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.cycle.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        stack: { select: { name: true, slug: true } },
        _count: { select: { entries: true } },
      },
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cycle = await db.cycle.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          entries: { orderBy: { date: "asc" } },
          bloodwork: { orderBy: { date: "asc" } },
          stack: {
            include: {
              compounds: { include: { compound: true } },
            },
          },
        },
      });
      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });
      return cycle;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        stackId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.cycle.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(CycleStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cycle = await db.cycle.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });
      return db.cycle.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  addEntry: protectedProcedure
    .input(
      z.object({
        cycleId: z.string(),
        date: z.date(),
        weight: z.number().positive().optional(),
        bodyFatPercent: z.number().min(0).max(100).optional(),
        sleepHours: z.number().min(0).max(24).optional(),
        sleepQuality: z.number().int().min(1).max(10).optional(),
        mood: z.number().int().min(1).max(10).optional(),
        energy: z.number().int().min(1).max(10).optional(),
        libido: z.number().int().min(1).max(10).optional(),
        appetite: z.number().int().min(1).max(10).optional(),
        restingHR: z.number().int().positive().optional(),
        bloodPressure: z.string().optional(),
        symptoms: z.array(z.string()).default([]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cycle = await db.cycle.findFirst({
        where: { id: input.cycleId, userId: ctx.session.user.id },
      });
      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });
      return db.cycleEntry.upsert({
        where: { cycleId_date: { cycleId: input.cycleId, date: input.date } },
        create: input,
        update: input,
      });
    }),
});
