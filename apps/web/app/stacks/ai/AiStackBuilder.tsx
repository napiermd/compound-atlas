"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Shield,
  Brain,
  Moon,
  Dumbbell,
  Heart,
  Zap,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { GoalBadge } from "@/components/stack/GoalBadge";
import { trpc } from "@/lib/trpc/client";
import type { StackCategory, StackGoal, CompoundCategory } from "@prisma/client";
import { confidenceLabelFromScore } from "@/lib/signal-vocabulary";

const GOAL_PRESETS = [
  { value: "Recomp", label: "Recomp", icon: Dumbbell },
  { value: "Bulk", label: "Bulk", icon: Zap },
  { value: "Cognitive", label: "Cognitive", icon: Brain },
  { value: "Sleep", label: "Sleep", icon: Moon },
  { value: "Longevity", label: "Longevity", icon: Heart },
  { value: "Recovery", label: "Recovery", icon: Activity },
];

const CONSTRAINTS = [
  { id: "no_prescription", label: "No prescription compounds" },
  { id: "no_gray_market", label: "No gray market" },
  { id: "no_sarms", label: "No SARMs" },
  { id: "budget_friendly", label: "Budget-friendly" },
  { id: "minimal_sides", label: "Minimal side effects" },
];

function categoryForGoal(goal: StackGoal): StackCategory {
  switch (goal) {
    case "RECOMP":
    case "BULK":
    case "CUT":
    case "ATHLETIC_PERFORMANCE":
      return "PERFORMANCE";
    case "COGNITIVE":
    case "MOOD":
      return "COGNITION";
    case "SLEEP":
    case "RECOVERY":
    case "JOINT_HEALTH":
      return "RECOVERY";
    case "LONGEVITY":
      return "LONGEVITY";
    case "GENERAL_HEALTH":
    case "METABOLIC_HEALTH":
      return "HEALTH";
    default:
      return "SPECIALTY";
  }
}

type Experience = "beginner" | "intermediate" | "advanced";
type BiologicalSex = "MALE" | "FEMALE";

interface AiProfile {
  sex: BiologicalSex | null;
  weightLbs: number | null;
  heightFt: number | null;
  heightIn: number | null;
}

interface AiCompound {
  slug: string;
  dose: number;
  unit: string;
  frequency: string;
  startWeek: number;
  endWeek: number;
  reasoning: string;
  compound: {
    id: string;
    name: string;
    category: CompoundCategory;
    evidenceScore: number | null;
    legalStatus: string;
  } | null;
}

interface AiResult {
  stackName: string;
  goal: StackGoal;
  durationWeeks: number;
  description: string;
  confidenceScore: number;
  compounds: AiCompound[];
  interactionWarnings: string[];
  safetyNotes: string[];
}

export function AiStackBuilder({ profile }: { profile: AiProfile | null }) {
  const router = useRouter();

  // Form state
  const [goal, setGoal] = useState("");
  const [goalPreset, setGoalPreset] = useState("");
  const [experience, setExperience] = useState<Experience>("intermediate");
  const [constraints, setConstraints] = useState<string[]>([]);
  const [currentCompounds, setCurrentCompounds] = useState("");
  const [sex, setSex] = useState<BiologicalSex | "">(
    profile?.sex ?? "",
  );
  const [weightLbs, setWeightLbs] = useState(
    profile?.weightLbs != null ? String(profile.weightLbs) : "",
  );
  const [heightFt, setHeightFt] = useState(
    profile?.heightFt != null ? String(profile.heightFt) : "",
  );
  const [heightIn, setHeightIn] = useState(
    profile?.heightIn != null ? String(profile.heightIn) : "",
  );

  // Result state
  const [result, setResult] = useState<AiResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save mutation
  const createStack = trpc.stack.create.useMutation({
    onSuccess: (stack) => router.push(`/stacks/${stack.slug}`),
  });

  function toggleConstraint(id: string) {
    setConstraints((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (!goal.trim() && !goalPreset) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const parsedWeightLbs = parseFloat(weightLbs);
      const parsedHeightFt = parseInt(heightFt, 10);
      const parsedHeightIn = parseInt(heightIn, 10);
      const hasBiometrics =
        sex !== "" ||
        !isNaN(parsedWeightLbs) ||
        !isNaN(parsedHeightFt) ||
        !isNaN(parsedHeightIn);

      const res = await fetch("/api/ai/generate-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim() || goalPreset,
          goalPreset: goalPreset || undefined,
          experience,
          constraints,
          currentCompounds: currentCompounds.trim(),
          biometrics: hasBiometrics
            ? {
                sex: sex || undefined,
                weightLbs: isNaN(parsedWeightLbs) ? undefined : parsedWeightLbs,
                heightFt: isNaN(parsedHeightFt) ? undefined : parsedHeightFt,
                heightIn: isNaN(parsedHeightIn) ? undefined : parsedHeightIn,
              }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed");
      }

      setResult(data as AiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSave() {
    if (!result) return;

    const compoundInputs = result.compounds
      .filter((c) => c.compound != null)
      .map((c) => ({
        compoundId: c.compound!.id,
        dose: c.dose || undefined,
        unit: c.unit || undefined,
        frequency: c.frequency || undefined,
        startWeek: c.startWeek || undefined,
        endWeek: c.endWeek || undefined,
        notes: c.reasoning ? `AI: ${c.reasoning}` : undefined,
      }));

    createStack.mutate({
      name: result.stackName,
      description: result.description,
      goal: result.goal,
      category: categoryForGoal(result.goal),
      durationWeeks: result.durationWeeks,
      isPublic: false,
      compounds: compoundInputs,
    });
  }

  const canGenerate = (goal.trim().length > 0 || goalPreset.length > 0) && !isGenerating;
  const isAnabolicOrHypertrophyFocus =
    goalPreset === "Bulk" ||
    goalPreset === "Recomp" ||
    /\b(bulk|hypertrophy|muscle|anabolic|lean mass|recomp)\b/i.test(goal);

  return (
    <div className="space-y-6">
      {/* Input form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What do you want to achieve?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Goal presets */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Quick presets
            </Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_PRESETS.map((p) => {
                const Icon = p.icon;
                const active = goalPreset === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setGoalPreset(active ? "" : p.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            {isAnabolicOrHypertrophyFocus && (
              <p className="text-xs text-muted-foreground mt-2">
                How to read anabolic/hypertrophy stacks: confidence reflects evidence coverage, not guaranteed personal response.
              </p>
            )}
          </div>

          {/* Custom goal textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="goal">Describe your goal (optional detail)</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. I'm 37M on TRT 160mg/week, want to recomp, preserve joints, and improve sleep quality"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Experience level */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Experience level
            </Label>
            <div className="flex gap-2">
              {(["beginner", "intermediate", "advanced"] as Experience[]).map(
                (level) => (
                  <button
                    key={level}
                    onClick={() => setExperience(level)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors border ${
                      experience === level
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {level}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Constraints</Label>
            <div className="grid grid-cols-2 gap-2">
              {CONSTRAINTS.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Checkbox
                    id={c.id}
                    checked={constraints.includes(c.id)}
                    onCheckedChange={() => toggleConstraint(c.id)}
                  />
                  <label
                    htmlFor={c.id}
                    className="text-xs cursor-pointer text-muted-foreground"
                  >
                    {c.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Body details (optional, improves dosing picks)
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Biological sex</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={sex === "MALE" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSex("MALE")}
                  >
                    Male
                  </Button>
                  <Button
                    type="button"
                    variant={sex === "FEMALE" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSex("FEMALE")}
                  >
                    Female
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-xs text-muted-foreground">
                  Weight (lbs)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  min={50}
                  max={700}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  placeholder="e.g. 175"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="height-ft" className="text-xs text-muted-foreground">
                  Height (ft)
                </Label>
                <Input
                  id="height-ft"
                  type="number"
                  min={3}
                  max={8}
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="height-in" className="text-xs text-muted-foreground">
                  Height (in)
                </Label>
                <Input
                  id="height-in"
                  type="number"
                  min={0}
                  max={11}
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
          </div>

          {/* Current compounds */}
          <div className="space-y-1.5">
            <Label htmlFor="current" className="text-xs text-muted-foreground">
              What are you currently taking? (optional)
            </Label>
            <Textarea
              id="current"
              value={currentCompounds}
              onChange={(e) => setCurrentCompounds(e.target.value)}
              placeholder="e.g. Creatine 5g/day, Vitamin D 5000 IU, Magnesium 400mg"
              rows={2}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate button */}
      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating stack...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Stack
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <Separator />

          {/* Warning banner */}
          <div className="flex gap-2 rounded-md border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/10 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              AI suggestions are for research purposes only. Always consult a
              healthcare provider before starting any supplement or compound
              protocol.
            </p>
          </div>

          {/* Stack header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold">{result.stackName}</h2>
                <GoalBadge goal={result.goal} />
              </div>
              {result.description && (
                <p className="text-sm text-muted-foreground">{result.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{result.durationWeeks} weeks</span>
                <span>{result.compounds.length} compounds</span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {confidenceLabelFromScore(result.confidenceScore)}
                  <strong
                    className={
                      result.confidenceScore >= 70
                        ? "text-green-600 dark:text-green-400"
                        : result.confidenceScore >= 40
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    }
                  >
                    {result.confidenceScore}/100
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Compounds */}
          <div className="space-y-2">
            {result.compounds
              .filter((c) => c.compound != null)
              .map((c, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono mt-0.5 w-5 shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">
                              {c.compound!.name}
                            </span>
                            <CategoryBadge category={c.compound!.category} />
                            <EvidenceScoreBadge
                              score={c.compound!.evidenceScore}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                            {c.dose && c.unit && (
                              <span className="tabular-nums">
                                {c.dose} {c.unit}
                              </span>
                            )}
                            {c.frequency && (
                              <span className="capitalize">{c.frequency}</span>
                            )}
                            {c.startWeek && c.endWeek && (
                              <span>
                                weeks {c.startWeek}–{c.endWeek}
                              </span>
                            )}
                          </div>
                          {c.reasoning && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {c.reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Interaction warnings */}
          {result.interactionWarnings?.length > 0 && (
            <Card className="border-orange-500/30">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Interaction Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-1">
                  {result.interactionWarnings.map((w, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Safety notes */}
          {result.safetyNotes?.length > 0 && (
            <Card className="border-blue-500/30">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Shield className="h-4 w-4" />
                  Safety Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-1">
                  {result.safetyNotes.map((n, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {n}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={createStack.isPending}
            >
              {createStack.isPending ? "Saving..." : "Save as Stack"}
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
          {createStack.error && (
            <p className="text-sm text-destructive">
              {createStack.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
