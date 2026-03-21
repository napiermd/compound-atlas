"use client";

import Link from "next/link";
import {
  User,
  HeartPulse,
  Target,
  Settings,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  ActivityLevel,
  BiologicalSex,
  HealthGoal,
} from "@prisma/client";

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
  completedAt: Date | null;
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentary",
  LIGHTLY_ACTIVE: "Lightly active",
  MODERATELY_ACTIVE: "Moderately active",
  VERY_ACTIVE: "Very active",
  ATHLETE: "Athlete",
};

const GOAL_LABELS: Record<HealthGoal, string> = {
  MUSCLE_GROWTH: "Muscle Growth",
  FAT_LOSS: "Fat Loss",
  COGNITIVE_ENHANCEMENT: "Cognitive Enhancement",
  SLEEP_OPTIMIZATION: "Sleep Optimization",
  LONGEVITY: "Longevity",
  HORMONE_OPTIMIZATION: "Hormone Optimization",
  GENERAL_WELLNESS: "General Wellness",
  ATHLETIC_PERFORMANCE: "Athletic Performance",
  STRESS_MANAGEMENT: "Stress Management",
  JOINT_HEALTH: "Joint Health",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ProfileDashboard({
  profile,
  labCount,
}: {
  profile: ProfileData;
  labCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/setup">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/stacks/personalized">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              View Recommendations
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Demographics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Age" value={profile.age?.toString() ?? null} />
            <InfoRow label="Sex" value={profile.biologicalSex} />
            <InfoRow
              label="Height"
              value={profile.heightCm ? `${profile.heightCm} cm` : null}
            />
            <InfoRow
              label="Weight"
              value={profile.weightKg ? `${profile.weightKg} kg` : null}
            />
            <InfoRow
              label="Body Fat"
              value={
                profile.bodyFatPercent ? `${profile.bodyFatPercent}%` : null
              }
            />
            <InfoRow
              label="Activity"
              value={
                profile.activityLevel
                  ? ACTIVITY_LABELS[profile.activityLevel]
                  : null
              }
            />
            <InfoRow
              label="Sleep"
              value={
                profile.sleepHours ? `${profile.sleepHours} hrs/night` : null
              }
            />
          </CardContent>
        </Card>

        {/* Health History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <HeartPulse className="h-4 w-4" />
              Health History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.conditions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {profile.conditions.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.medications.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Medications
                </p>
                <div className="flex flex-wrap gap-1">
                  {profile.medications.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.allergies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Allergies</p>
                <div className="flex flex-wrap gap-1">
                  {profile.allergies.map((a) => (
                    <Badge key={a} variant="outline" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <InfoRow label="Diet" value={profile.dietType} />
            <InfoRow label="Smoking" value={profile.smokingStatus} />
            <InfoRow label="Alcohol" value={profile.alcoholUse} />
          </CardContent>
        </Card>
      </div>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map((g) => (
              <Badge key={g} className="text-xs">
                {GOAL_LABELS[g]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lab Results summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {labCount > 0
              ? `${labCount} lab result${labCount !== 1 ? "s" : ""} on file`
              : "No lab results yet"}
          </p>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">
            Lab results improve recommendation accuracy by identifying
            biomarker-specific needs (e.g., low testosterone, high CRP).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
