import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "@/lib/db";
import { ActivityLevel, BiologicalSex, HealthGoal } from "@prisma/client";

export const healthProfileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.healthProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        age: z.number().int().min(13).max(120).optional().nullable(),
        biologicalSex: z.nativeEnum(BiologicalSex).optional().nullable(),
        heightCm: z.number().positive().max(300).optional().nullable(),
        weightKg: z.number().positive().max(500).optional().nullable(),
        bodyFatPercent: z.number().min(1).max(70).optional().nullable(),
        activityLevel: z.nativeEnum(ActivityLevel).optional().nullable(),
        sleepHours: z.number().min(0).max(24).optional().nullable(),
        goals: z.array(z.nativeEnum(HealthGoal)).default([]),
        conditions: z.array(z.string().trim().min(1)).default([]),
        medications: z.array(z.string().trim().min(1)).default([]),
        allergies: z.array(z.string().trim().min(1)).default([]),
        dietType: z.string().trim().optional().nullable(),
        smokingStatus: z.string().trim().optional().nullable(),
        alcoholUse: z.string().trim().optional().nullable(),
        notes: z.string().optional().nullable(),
        completedAt: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return db.healthProfile.upsert({
        where: { userId },
        create: { userId, ...input },
        update: input,
      });
    }),
});
