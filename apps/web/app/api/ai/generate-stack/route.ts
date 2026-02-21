import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_FREE_MODELS = [
  process.env.OPENROUTER_MODEL,
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
].filter((model): model is string => Boolean(model));

const CONSTRAINT_LABELS: Record<string, string> = {
  "no-prescription": "No prescription compounds",
  "no-gray-market": "No gray market compounds",
  "no-sarms": "No SARMs",
  "otc-only": "OTC compounds only",
  "budget-friendly": "Budget-friendly preference",
  "minimal-sides": "Minimal side effects",
};

function normalizeConstraint(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, "-");
}

function hasConstraint(constraints: Set<string>, name: string): boolean {
  return constraints.has(name) || constraints.has(name.replace(/-/g, "_"));
}

async function callOpenRouter({
  apiKey,
  models,
  systemPrompt,
  userPrompt,
}: {
  apiKey: string;
  models: string[];
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ text: string; modelUsed: string }> {
  let lastError: string | null = null;

  for (const model of models) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://compound-atlas.vercel.app",
        "X-Title": "CompoundAtlas",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2200,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      lastError = `OpenRouter ${model} error ${response.status}: ${await response.text()}`;
      continue;
    }

    const completion = await response.json();
    const text: string = completion.choices?.[0]?.message?.content ?? "";
    if (text) {
      return { text, modelUsed: model };
    }

    lastError = `OpenRouter ${model} returned an empty response`;
  }

  throw new Error(lastError ?? "No AI models available");
}

const RequestSchema = z.object({
  goal: z.string().min(1).max(1000),
  goalPreset: z.string().optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  constraints: z.array(z.string()),
  currentCompounds: z.string().max(500),
  budget: z.number().optional(),
  biometrics: z
    .object({
      sex: z.enum(["MALE", "FEMALE"]).optional(),
      weightLbs: z.number().positive().max(700).optional(),
      heightFt: z.number().int().min(3).max(8).optional(),
      heightIn: z.number().int().min(0).max(11).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to use AI Stack Builder." },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: "Your account is not eligible for AI Stack Builder." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const input = RequestSchema.parse(body);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI features are not configured. Set OPENROUTER_API_KEY." },
        { status: 503 }
      );
    }

    const normalizedConstraints = Array.from(
      new Set(input.constraints.map(normalizeConstraint))
    );
    const constraintSet = new Set(normalizedConstraints);
    const minEvidence = input.experience === "beginner" ? 45 : input.experience === "intermediate" ? 35 : 25;
    const minSafety = input.experience === "beginner" ? 65 : input.experience === "intermediate" ? 55 : 45;

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

    const applyPromptFilters = (
      source: typeof compounds,
      options: { minEvidence?: number; minSafety?: number }
    ) => {
      let next = source;

      if (options.minEvidence != null) {
        next = next.filter((c) => (c.evidenceScore ?? 0) >= options.minEvidence!);
      }
      if (options.minSafety != null) {
        next = next.filter((c) => (c.safetyScore ?? 0) >= options.minSafety!);
      }

      if (hasConstraint(constraintSet, "otc-only")) {
        next = next.filter((c) => c.legalStatus === "LEGAL");
      } else if (hasConstraint(constraintSet, "no-prescription")) {
        next = next.filter(
          (c) => c.legalStatus !== "PRESCRIPTION" && c.legalStatus !== "SCHEDULED"
        );
      }

      if (hasConstraint(constraintSet, "no-gray-market")) {
        next = next.filter((c) => c.legalStatus !== "GRAY_MARKET");
      }
      if (hasConstraint(constraintSet, "no-sarms")) {
        next = next.filter((c) => c.category !== "SARM");
      }
      if (hasConstraint(constraintSet, "minimal-sides")) {
        next = next.filter((c) => {
          if ((c.safetyScore ?? 0) < 60) return false;
          return !c.sideEffects.some((fx) => {
            const severity = (fx.severity ?? "").toLowerCase();
            return severity.includes("severe") || severity.includes("high");
          });
        });
      }
      if (hasConstraint(constraintSet, "budget-friendly")) {
        next = next.filter(
          (c) =>
            !["PEPTIDE", "GH_SECRETAGOGUE", "HORMONAL", "ANABOLIC", "SARM"].includes(
              c.category
            )
        );
      }

      return next;
    };

    let promptCompounds = applyPromptFilters(compounds, {
      minEvidence,
      minSafety,
    });

    if (promptCompounds.length < 40) {
      // Relax score floors, but always preserve user constraints.
      promptCompounds = applyPromptFilters(compounds, {
        minEvidence: 20,
      }).slice(0, 120);
    }

    if (promptCompounds.length < 20) {
      promptCompounds = applyPromptFilters(compounds, {}).slice(0, 120);
    }

    const systemPrompt = `You are a compound research assistant for CompoundAtlas, an evidence-based stack planning platform.

Your job is to suggest safe, evidence-based compound stacks based on user goals.

Rules:
- ONLY suggest compounds that exist in the provided database (match exactly by slug)
- Prioritize compounds with higher evidenceScore (0-100 scale)
- Prioritize compounds with higher safetyScore and mainstream human-use profiles
- Respect legal status constraints when specified
- Consider compound interactions — flag any caution or contraindicated pairs
- For beginners: suggest simpler stacks with well-studied compounds only
- For intermediate/advanced: can include more specialized compounds
- Keep stacks focused: 3-7 compounds is ideal
- Always include safety notes for any compounds with known risks
- If user biometrics are provided, adjust dose ranges conservatively

Response format: Return ONLY valid JSON, no markdown fences, no explanation outside the JSON.`;

    const constraintText =
      normalizedConstraints.length > 0
        ? `\nConstraints: ${normalizedConstraints
            .map((c) => CONSTRAINT_LABELS[c] ?? c)
            .join(", ")}`
        : "";
    const biometricsText = input.biometrics
      ? `\n- Biometrics: ${[
          input.biometrics.sex ? `sex ${input.biometrics.sex}` : null,
          input.biometrics.weightLbs != null
            ? `weight ${input.biometrics.weightLbs} lbs`
            : null,
          input.biometrics.heightFt != null && input.biometrics.heightIn != null
            ? `height ${input.biometrics.heightFt}'${input.biometrics.heightIn}"`
            : null,
        ]
          .filter(Boolean)
          .join(", ") || "provided" }`
      : "";

    const userPrompt = `User request:
- Goal: ${input.goal}${input.goalPreset ? ` (preset: ${input.goalPreset})` : ""}
- Experience level: ${input.experience}
- Currently taking: ${input.currentCompounds || "nothing"}${constraintText}${input.budget ? `\n- Budget: $${input.budget}/month` : ""}${biometricsText}

Available compounds database:
${JSON.stringify(
  promptCompounds.map((c) => ({
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

    const { text, modelUsed } = await callOpenRouter({
      apiKey,
      models: DEFAULT_FREE_MODELS,
      systemPrompt,
      userPrompt,
    });

    // Extract JSON — strip markdown fences if model includes them
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return valid JSON");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Enrich with DB compound IDs
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
      modelUsed,
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
