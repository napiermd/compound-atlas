import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const RequestSchema = z.object({
  goal: z.string().min(1).max(1000),
  goalPreset: z.string().optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  constraints: z.array(z.string()),
  currentCompounds: z.string().max(500),
  budget: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = RequestSchema.parse(body);

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI features are not configured. Set ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    // Fetch compounds from DB
    const compounds = await db.compound.findMany({
      select: {
        slug: true,
        name: true,
        category: true,
        legalStatus: true,
        evidenceScore: true,
        safetyScore: true,
        description: true,
        doseMin: true,
        doseTypical: true,
        doseMax: true,
        doseUnit: true,
        doseFrequency: true,
        mechanismShort: true,
        sideEffects: {
          select: { name: true, severity: true },
          take: 5,
        },
        interactions: {
          select: {
            target: { select: { name: true } },
            interactionType: true,
            severity: true,
          },
          take: 10,
        },
      },
      orderBy: { evidenceScore: "desc" },
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are a compound research assistant for CompoundAtlas, an evidence-based stack planning platform.

Your job is to suggest safe, evidence-based compound stacks based on user goals.

Rules:
- ONLY suggest compounds that exist in the provided database (match exactly by slug)
- Prioritize compounds with higher evidenceScore (0-100 scale)
- Respect legal status constraints when specified
- Consider compound interactions — flag any caution or contraindicated pairs
- For beginners: suggest simpler stacks with well-studied compounds only
- For intermediate/advanced: can include more specialized compounds
- Keep stacks focused: 3-7 compounds is ideal
- Always include safety notes for any compounds with known risks

Response format: Return ONLY valid JSON, no markdown, no explanation outside the JSON.`;

    const constraintText =
      input.constraints.length > 0
        ? `\nConstraints: ${input.constraints.join(", ")}`
        : "";

    const userPrompt = `User request:
- Goal: ${input.goal}${input.goalPreset ? ` (preset: ${input.goalPreset})` : ""}
- Experience level: ${input.experience}
- Currently taking: ${input.currentCompounds || "nothing"}${constraintText}${input.budget ? `\n- Budget: $${input.budget}/month` : ""}

Available compounds database:
${JSON.stringify(
  compounds.map((c) => ({
    slug: c.slug,
    name: c.name,
    category: c.category,
    legalStatus: c.legalStatus,
    evidenceScore: c.evidenceScore,
    safetyScore: c.safetyScore,
    description: c.description,
    doseMin: c.doseMin,
    doseTypical: c.doseTypical,
    doseMax: c.doseMax,
    doseUnit: c.doseUnit,
    doseFrequency: c.doseFrequency,
    mechanismShort: c.mechanismShort,
    sideEffects: c.sideEffects,
    interactions: c.interactions,
  })),
  null,
  2
)}

Return a JSON object with this exact structure:
{
  "stackName": "descriptive stack name",
  "goal": "one of: RECOMP|BULK|CUT|COGNITIVE|SLEEP|LONGEVITY|RECOVERY|JOINT_HEALTH|MOOD|LIBIDO|GENERAL_HEALTH|CUSTOM",
  "durationWeeks": number (4-16),
  "description": "2-3 sentence protocol description",
  "confidenceScore": number (0-100, based on average evidence scores),
  "compounds": [
    {
      "slug": "exact-slug-from-db",
      "dose": number,
      "unit": "mg|mcg|IU|g|ml",
      "frequency": "daily|2x/day|3x/day|2x/week|M/W/F|weekly",
      "startWeek": 1,
      "endWeek": number,
      "reasoning": "1-2 sentences why this compound is included"
    }
  ],
  "interactionWarnings": ["warning text if any"],
  "safetyNotes": ["safety note text"]
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return valid JSON");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Enrich compounds with DB data
    const enrichedCompounds = await Promise.all(
      (result.compounds ?? []).map(
        async (c: {
          slug: string;
          dose: number;
          unit: string;
          frequency: string;
          startWeek: number;
          endWeek: number;
          reasoning: string;
        }) => {
          const compound = await db.compound.findUnique({
            where: { slug: c.slug },
            select: {
              id: true,
              name: true,
              category: true,
              evidenceScore: true,
              legalStatus: true,
            },
          });
          return { ...c, compound };
        }
      )
    );

    return NextResponse.json({
      ...result,
      compounds: enrichedCompounds.filter((c) => c.compound != null),
    });
  } catch (err) {
    console.error("AI stack generation error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
