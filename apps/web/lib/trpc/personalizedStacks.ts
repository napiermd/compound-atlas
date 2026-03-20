import { router, protectedProcedure } from "./trpc";
import { db } from "@/lib/db";
import { scoreStacks, type LabSnapshot, type UserPhenotype, type StackCandidate } from "@/lib/stack-engine";

export const personalizedStacksRouter = router({
  recommend: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Fetch user profile and labs in parallel
    const [profile, labs, rawStacks] = await Promise.all([
      db.healthProfile.findUnique({ where: { userId } }),
      db.labResult.findMany({
        where: { userId },
        orderBy: { testedAt: "desc" },
      }),
      db.stack.findMany({
        where: { isPublic: true },
        take: 200,
        include: {
          compounds: {
            include: {
              compound: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  category: true,
                  evidenceScore: true,
                  safetyScore: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!profile) {
      return { hasProfile: false as const, stacks: [] };
    }

    const phenotype: UserPhenotype = {
      age: profile.age,
      biologicalSex: profile.biologicalSex,
      weightKg: profile.weightKg,
      bodyFatPercent: profile.bodyFatPercent,
      activityLevel: profile.activityLevel,
      sleepHours: profile.sleepHours,
      goals: profile.goals,
      conditions: profile.conditions,
      medications: profile.medications,
    };

    // De-dupe labs by marker (keep most recent)
    const latestLabs = new Map<string, LabSnapshot>();
    for (const lab of labs) {
      const key = lab.marker.toLowerCase();
      if (!latestLabs.has(key)) {
        latestLabs.set(key, {
          marker: lab.marker,
          value: lab.value,
          unit: lab.unit,
          refRangeLow: lab.refRangeLow,
          refRangeHigh: lab.refRangeHigh,
        });
      }
    }

    const candidates: StackCandidate[] = rawStacks.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      goal: s.goal,
      evidenceScore: s.evidenceScore,
      upvotes: s.upvotes,
      compounds: s.compounds.map((sc) => ({
        compound: sc.compound,
        dose: sc.dose,
        unit: sc.unit,
      })),
    }));

    const scored = scoreStacks(candidates, phenotype, Array.from(latestLabs.values()));

    return {
      hasProfile: true as const,
      stacks: scored.slice(0, 20),
    };
  }),
});
