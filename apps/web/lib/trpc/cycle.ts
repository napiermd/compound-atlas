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
        entries: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
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
              compounds: {
                include: {
                  compound: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      category: true,
                      doseUnit: true,
                    },
                  },
                },
                orderBy: { startWeek: "asc" },
              },
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const status =
        input.startDate && input.startDate <= today
          ? CycleStatus.ACTIVE
          : CycleStatus.PLANNED;
      return db.cycle.create({
        data: { ...input, userId: ctx.session.user.id, status },
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
        compoundsTaken: z
          .array(
            z.object({
              compoundId: z.string(),
              dose: z.number().optional(),
              unit: z.string().optional(),
            })
          )
          .optional(),
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

      const normalizedDate = new Date(input.date);
      normalizedDate.setHours(0, 0, 0, 0);

      return db.cycleEntry.upsert({
        where: {
          cycleId_date: { cycleId: input.cycleId, date: normalizedDate },
        },
        create: { ...input, date: normalizedDate },
        update: { ...input, date: normalizedDate },
      });
    }),

  addBloodwork: protectedProcedure
    .input(
      z.object({
        cycleId: z.string(),
        date: z.date(),
        labName: z.string().optional(),
        results: z.record(z.number().nullable()),
        fileUrl: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cycle = await db.cycle.findFirst({
        where: { id: input.cycleId, userId: ctx.session.user.id },
      });
      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });
      return db.bloodworkPanel.create({ data: input });
    }),
});
