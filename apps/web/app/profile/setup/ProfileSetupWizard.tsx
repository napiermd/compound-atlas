"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const HEALTH_GOALS = [
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
] as const;

const ACTIVITY_LEVELS = [
  { value: "SEDENTARY", label: "Sedentary (desk job, minimal exercise)" },
  { value: "LIGHTLY_ACTIVE", label: "Lightly Active (1-2 days/week)" },
  { value: "MODERATELY_ACTIVE", label: "Moderately Active (3-5 days/week)" },
  { value: "VERY_ACTIVE", label: "Very Active (6-7 days/week)" },
  { value: "ATHLETE", label: "Athlete (2+ sessions/day)" },
] as const;

const COMMON_CONDITIONS = [
  "hypertension",
  "diabetes_type2",
  "hypothyroid",
  "hyperthyroid",
  "liver_disease",
  "kidney_disease",
  "heart_disease",
  "anxiety",
  "depression",
  "insomnia",
  "pcos",
  "autoimmune",
];

type FormData = {
  age: string;
  biologicalSex: string;
  heightCm: string;
  weightKg: string;
  bodyFatPercent: string;
  activityLevel: string;
  sleepHours: string;
  goals: string[];
  conditions: string[];
  medications: string;
  allergies: string;
  dietType: string;
  smokingStatus: string;
  alcoholUse: string;
};

const STEPS = ["Demographics", "Health History", "Goals"] as const;

export function ProfileSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    age: "",
    biologicalSex: "",
    heightCm: "",
    weightKg: "",
    bodyFatPercent: "",
    activityLevel: "",
    sleepHours: "",
    goals: [],
    conditions: [],
    medications: "",
    allergies: "",
    dietType: "",
    smokingStatus: "",
    alcoholUse: "",
  });

  const upsert = trpc.healthProfile.upsert.useMutation({
    onSuccess: () => {
      router.push("/stacks/personalized");
    },
  });

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGoal(goal: string) {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  }

  function toggleCondition(condition: string) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter((c) => c !== condition)
        : [...prev.conditions, condition],
    }));
  }

  function handleSubmit() {
    const parseFloat_ = (v: string) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const parseInt_ = (v: string) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    };

    upsert.mutate({
      age: parseInt_(form.age),
      biologicalSex:
        form.biologicalSex === "MALE" || form.biologicalSex === "FEMALE"
          ? form.biologicalSex
          : null,
      heightCm: parseFloat_(form.heightCm),
      weightKg: parseFloat_(form.weightKg),
      bodyFatPercent: parseFloat_(form.bodyFatPercent),
      activityLevel: (form.activityLevel || null) as Parameters<
        typeof upsert.mutate
      >[0]["activityLevel"],
      sleepHours: parseFloat_(form.sleepHours),
      goals: form.goals as Parameters<typeof upsert.mutate>[0]["goals"],
      conditions: form.conditions,
      medications: form.medications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: form.allergies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dietType: form.dietType || null,
      smokingStatus: form.smokingStatus || null,
      alcoholUse: form.alcoholUse || null,
      completedAt: new Date(),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={i <= step ? "text-foreground font-medium" : ""}
            >
              {label}
            </span>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {/* Step 1: Demographics */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g. 30"
                  value={form.age}
                  onChange={(e) => updateField("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Biological Sex</Label>
                <Select
                  value={form.biologicalSex}
                  onValueChange={(v) => updateField("biologicalSex", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  placeholder="e.g. 178"
                  value={form.heightCm}
                  onChange={(e) => updateField("heightCm", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  placeholder="e.g. 82"
                  value={form.weightKg}
                  onChange={(e) => updateField("weightKg", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bodyFat">Body Fat % (optional)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  placeholder="e.g. 18"
                  value={form.bodyFatPercent}
                  onChange={(e) => updateField("bodyFatPercent", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select
                  value={form.activityLevel}
                  onValueChange={(v) => updateField("activityLevel", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
              <Label htmlFor="sleepHours">Average Sleep (hours/night)</Label>
              <Input
                id="sleepHours"
                type="number"
                step="0.5"
                placeholder="e.g. 7"
                value={form.sleepHours}
                onChange={(e) => updateField("sleepHours", e.target.value)}
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
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Existing Conditions (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_CONDITIONS.map((condition) => (
                  <label
                    key={condition}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.conditions.includes(condition)}
                      onCheckedChange={() => toggleCondition(condition)}
                    />
                    {condition.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">
                Current Medications (comma-separated)
              </Label>
              <Input
                id="medications"
                placeholder="e.g. metformin, levothyroxine"
                value={form.medications}
                onChange={(e) => updateField("medications", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">
                Allergies / Sensitivities (comma-separated)
              </Label>
              <Input
                id="allergies"
                placeholder="e.g. shellfish, sulfa"
                value={form.allergies}
                onChange={(e) => updateField("allergies", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Diet</Label>
                <Select
                  value={form.dietType}
                  onValueChange={(v) => updateField("dietType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="omnivore">Omnivore</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="keto">Keto</SelectItem>
                    <SelectItem value="paleo">Paleo</SelectItem>
                    <SelectItem value="carnivore">Carnivore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Smoking</Label>
                <Select
                  value={form.smokingStatus}
                  onValueChange={(v) => updateField("smokingStatus", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="former">Former</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alcohol</Label>
                <Select
                  value={form.alcoholUse}
                  onValueChange={(v) => updateField("alcoholUse", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Goals */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>What are your goals?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select the goals that matter most to you. We&apos;ll use these to
              rank stacks by relevance.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {HEALTH_GOALS.map((goal) => {
                const selected = form.goals.includes(goal.value);
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleGoal(goal.value)}
                    className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {goal.label}
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving..." : "Get Recommendations"}
          </Button>
        )}
      </div>
    </div>
  );
}
