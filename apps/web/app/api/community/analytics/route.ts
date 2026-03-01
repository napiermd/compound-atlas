import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreCommunityAnalytics } from "@/lib/community-analytics";
import { getStaleThresholdDays } from "@/lib/compound-freshness";

const eventSchema = z.object({
  compounds: z.array(z.string().min(1)).min(1),
  goalContext: z.string().min(1),
  mentionedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1).optional(),
});

const requestSchema = z.object({
  events: z.array(eventSchema),
  windowDays: z.number().int().min(7).max(180).default(30),
  staleThresholdDays: z.number().int().min(1).max(3650).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { events, windowDays, staleThresholdDays } = parsed.data;
    const resolvedStaleThreshold = staleThresholdDays ?? getStaleThresholdDays();
    const analytics = scoreCommunityAnalytics(events, {
      windowDays,
      staleThresholdDays: resolvedStaleThreshold,
      now: new Date(),
    });

    return NextResponse.json({
      ...analytics,
      meta: {
        inputEvents: events.length,
        windowDays,
        staleThresholdDays: resolvedStaleThreshold,
        nootropicSlices: ["focus", "memory", "sleep", "mood", "productivity", "other"],
      },
    });
  } catch (error) {
    console.error("community analytics API failed", error);
    return NextResponse.json({ error: "Unable to score community analytics" }, { status: 500 });
  }
}
