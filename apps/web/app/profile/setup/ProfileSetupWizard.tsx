"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  HeartPulse,
  Target,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import type {
  ActivityLevel,
  BiologicalSex,
  HealthGoal,
} from "@prisma/client";

const STEPS = [
  { label: "Demographics", icon: User },
  { label: "Health History", icon: HeartPulse },
  { label: "Goals", icon: Target },
] as const;

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: "SEDENTARY", label: "Sedentary (desk job, little exercise)" },
  { value: "LIGHTLY_ACTIVE", label: "Lightly active (1-2x/week)" },
  { value: "MODERATELY_ACTIVE", label: "Moderately active (3-4x/week)" },
  { value: "VERY_ACTIVE", label: "Very active (5-6x/week)" },
  { value: "ATHLETE", label: "Athlete (daily intense training)" },
];

const HEALTH_GOALS: { value: HealthGoal; label: string }[] = [
  { value: "MUSCLE_GROWTH", label: "Muscle Growth" },
  { value: "FAT_LOSS", label: "Fat Loss" },
  { value: "COGNITIVE_ENHANCEMENT", label: "Cognitive Enhancement" },
  { value: "SLEEP_OPTIMIZATION", label: "Sleep Optimization" },
  { value: "LONGEVITY", label: "Longevity" },
  { value: "HORMONE_OPTIMIZATION", label: "Hormone Optimization" },
  { value: "GENERAL_WELLNESS", label: "General Wellness" },
  { value: "ATHLETIC_PERFORMANCE", label: "Athletic Performance" },
  { value: "STRESS_MANAGEMENT", label: "Stress Management" },
  { value: "JOINT_HEALTH", label: "Joint Health" },
];

const DIET_OPTIONS = [
  "Omnivore",
  "Vegetarian",
  "Vegan",
  "Keto",
  "Paleo",
  "Mediterranean",
  "Carnivore",
  "Other",
];

interface ProfileData {
  age: number | null;
  biologicalSex: BiologicalSex | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  activityLevel: ActivityLevel | null;
  sleepHours: number | null;
  goals: HealthGoal[];
  conditions: string[];
  medications: string[];
  allergies: string[];
  dietType: string | null;
  smokingStatus: string | null;
  alcoholUse: string | null;
  notes: string | null;
}

const defaultProfile: ProfileData = {
  age: null,
  biologicalSex: null,
  heightCm: null,
  weightKg: null,
  bodyFatPercent: null,
  activityLevel: null,
  sleepHours: null,
  goals: [],
  conditions: [],
  medications: [],
  allergies: [],
  dietType: null,
  smokingStatus: null,
  alcoholUse: null,
  notes: null,
};

interface Props {
  existing?: Partial<ProfileData> | null;
}

export function ProfileSetupWizard({ existing }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProfileData>({
    ...defaultProfile,
    ...existing,
    goals: existing?.goals ?? [],
    conditions: existing?.conditions ?? [],
    medications: existing?.medications ?? [],
    allergies: existing?.allergies ?? [],
  });

  const upsert = trpc.healthProfile.upsert.useMutation({
    onSuccess: () => {
      router.push("/stacks/personalized");
      router.refresh();
    },
  });

  const update = <K extends keyof ProfileData>(key: K, val: ProfileData[K]) =>
    setData((prev) => ({ ...prev, [key]: val }));

  const toggleGoal = (goal: HealthGoal) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handleSubmit = () => {
    upsert.mutate({
      ...data,
      completedAt: new Date(),
    });
  };

  const canProceed = () => {
    if (step === 2) return data.goals.length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 transition-colors ${
                  i === step
                    ? "text-foreground font-medium"
                    : i < step
                      ? "text-primary"
                      : ""
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {/* Step 1: Demographics */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={13}
                  max={120}
                  placeholder="e.g. 30"
                  value={data.age ?? ""}
                  onChange={(e) =>
                    update("age", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Biological Sex</Label>
                <Select
                  value={data.biologicalSex ?? ""}
                  onValueChange={(v) =>
                    update("biologicalSex", v as BiologicalSex)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min={100}
                  max={250}
                  placeholder="e.g. 178"
                  value={data.heightCm ?? ""}
                  onChange={(e) =>
                    update(
                      "heightCm",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={30}
                  max={300}
                  placeholder="e.g. 80"
                  value={data.weightKg ?? ""}
                  onChange={(e) =>
                    update(
                      "weightKg",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bf">Body Fat % (optional)</Label>
                <Input
                  id="bf"
                  type="number"
                  min={1}
                  max={70}
                  placeholder="e.g. 15"
                  value={data.bodyFatPercent ?? ""}
                  onChange={(e) =>
                    update(
                      "bodyFatPercent",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select
                  value={data.activityLevel ?? ""}
                  onValueChange={(v) =>
                    update("activityLevel", v as ActivityLevel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((al) => (
                      <SelectItem key={al.value} value={al.value}>
                        {al.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sleep">Average Sleep (hours/night)</Label>
              <Input
                id="sleep"
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="e.g. 7.5"
                value={data.sleepHours ?? ""}
                onChange={(e) =>
                  update(
                    "sleepHours",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Health History */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Health History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditions">
                Conditions (comma-separated)
              </Label>
              <Input
                id="conditions"
                placeholder="e.g. hypertension, hypothyroid"
                value={data.conditions.join(", ")}
                onChange={(e) =>
                  update(
                    "conditions",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Used to flag potentially unsafe compounds
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">
                Current Medications (comma-separated)
              </Label>
              <Input
                id="medications"
                placeholder="e.g. levothyroxine, metformin"
                value={data.medications.join(", ")}
                onChange={(e) =>
                  update(
                    "medications",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">
                Allergies / Sensitivities (comma-separated)
              </Label>
              <Input
                id="allergies"
                placeholder="e.g. shellfish, soy"
                value={data.allergies.join(", ")}
                onChange={(e) =>
                  update(
                    "allergies",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Diet Type</Label>
                <Select
                  value={data.dietType ?? ""}
                  onValueChange={(v) => update("dietType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d.toLowerCase()}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Smoking</Label>
                <Select
                  value={data.smokingStatus ?? ""}
                  onValueChange={(v) => update("smokingStatus", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="former">Former</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Alcohol Use</Label>
                <Select
                  value={data.alcoholUse ?? ""}
                  onValueChange={(v) => update("alcoholUse", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Anything else relevant to your health..."
                value={data.notes ?? ""}
                onChange={(e) => update("notes", e.target.value || null)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Goals */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select at least one goal to personalize your stack recommendations.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {HEALTH_GOALS.map((g) => {
                const selected = data.goals.includes(g.value);
                return (
                  <button
                    key={g.value}
                    onClick={() => toggleGoal(g.value)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium">{g.label}</span>
                    {selected && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || upsert.isPending}
          >
            {upsert.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Get Personalized Stacks
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
