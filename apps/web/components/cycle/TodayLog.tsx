"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { CycleData, CycleEntryData } from "./types";

const SYMPTOM_LABELS: Record<string, string> = {
  headache: "Headache",
  acne: "Acne",
  joint_pain: "Joint Pain",
  bloating: "Bloating",
  insomnia: "Insomnia",
  fatigue: "Fatigue",
  anxiety: "Anxiety",
  mood_swings: "Mood Swings",
  hair_shedding: "Hair Shedding",
  back_pumps: "Back Pumps",
  night_sweats: "Night Sweats",
};

const SCALE_FIELDS = [
  { key: "mood" as const, label: "Mood" },
  { key: "energy" as const, label: "Energy" },
  { key: "libido" as const, label: "Libido" },
  { key: "sleepQuality" as const, label: "Sleep Quality" },
  { key: "appetite" as const, label: "Appetite" },
];

type ScaleKey = "mood" | "energy" | "libido" | "sleepQuality" | "appetite";

interface Props {
  cycle: Pick<CycleData, "id" | "stack">;
  todayEntry: CycleEntryData | null;
  onEntryAdded: (entry: CycleEntryData) => void;
}

export function TodayLog({ cycle, todayEntry, onEntryAdded }: Props) {
  const compounds = cycle.stack?.compounds ?? [];

  const [checkedCompounds, setCheckedCompounds] = useState<Set<string>>(
    () =>
      new Set(
        (
          todayEntry?.compoundsTaken as
            | Array<{ compoundId: string }>
            | null
            | undefined
        )?.map((c) => c.compoundId) ?? []
      )
  );
  const [weight, setWeight] = useState(
    todayEntry?.weight?.toString() ?? ""
  );
  const [restingHR, setRestingHR] = useState(
    todayEntry?.restingHR?.toString() ?? ""
  );
  const [bloodPressure, setBloodPressure] = useState(
    todayEntry?.bloodPressure ?? ""
  );
  const [sleepHours, setSleepHours] = useState(
    todayEntry?.sleepHours?.toString() ?? ""
  );
  const [scales, setScales] = useState<Partial<Record<ScaleKey, number>>>({
    mood: todayEntry?.mood ?? undefined,
    energy: todayEntry?.energy ?? undefined,
    libido: todayEntry?.libido ?? undefined,
    sleepQuality: todayEntry?.sleepQuality ?? undefined,
    appetite: todayEntry?.appetite ?? undefined,
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(
    () => new Set(todayEntry?.symptoms ?? [])
  );
  const [notes, setNotes] = useState(todayEntry?.notes ?? "");

  function toggleCompound(id: string) {
    setCheckedCompounds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSymptom(key: string) {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setScale(field: ScaleKey, value: number) {
    setScales((prev) => ({ ...prev, [field]: value }));
  }

  const addEntry = trpc.cycle.addEntry.useMutation({
    onSuccess: (result) => {
      onEntryAdded({
        ...result,
        date: result.date.toISOString(),
        compoundsTaken: result.compoundsTaken as CycleEntryData["compoundsTaken"],
      });
    },
  });

  function handleSubmit() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compoundsTaken =
      compounds.length > 0
        ? compounds
            .filter((c) => checkedCompounds.has(c.compoundId))
            .map((c) => ({
              compoundId: c.compoundId,
              dose: c.dose ?? undefined,
              unit: c.unit ?? undefined,
            }))
        : undefined;

    addEntry.mutate({
      cycleId: cycle.id,
      date: today,
      compoundsTaken,
      weight: weight ? parseFloat(weight) : undefined,
      restingHR: restingHR ? parseInt(restingHR) : undefined,
      bloodPressure: bloodPressure || undefined,
      sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
      mood: scales.mood,
      energy: scales.energy,
      libido: scales.libido,
      sleepQuality: scales.sleepQuality,
      appetite: scales.appetite,
      symptoms: Array.from(selectedSymptoms),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Today — {format(new Date(), "EEEE, MMM d")}
        </h3>
        {todayEntry && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Logged
          </span>
        )}
      </div>

      {/* Compound checkboxes */}
      {compounds.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Compounds taken
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {compounds.map((c) => (
              <label
                key={c.compoundId}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={checkedCompounds.has(c.compoundId)}
                  onCheckedChange={() => toggleCompound(c.compoundId)}
                />
                <span className="truncate">{c.compound.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="log-weight" className="text-xs">
            Weight (kg)
          </Label>
          <Input
            id="log-weight"
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="75.0"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-hr" className="text-xs">
            Resting HR
          </Label>
          <Input
            id="log-hr"
            type="number"
            min="30"
            max="220"
            value={restingHR}
            onChange={(e) => setRestingHR(e.target.value)}
            placeholder="60"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-bp" className="text-xs">
            Blood Pressure
          </Label>
          <Input
            id="log-bp"
            value={bloodPressure}
            onChange={(e) => setBloodPressure(e.target.value)}
            placeholder="120/80"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-sleep" className="text-xs">
            Sleep (hrs)
          </Label>
          <Input
            id="log-sleep"
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            placeholder="7.5"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* 1–10 scales */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Subjective scores
        </Label>
        <div className="space-y-2.5">
          {SCALE_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground w-24 shrink-0">
                {label}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScale(key, n)}
                    className={cn(
                      "h-6 w-6 rounded text-xs font-medium transition-colors",
                      scales[key] === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {scales[key] != null && (
                <span className="text-xs text-muted-foreground">
                  {scales[key]}/10
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Symptoms
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(SYMPTOM_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSymptom(key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
                selectedSymptoms.has(key)
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="log-notes" className="text-xs">
          Notes
        </Label>
        <Textarea
          id="log-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How are you feeling? Any observations..."
          rows={2}
          className="resize-none"
        />
      </div>

      {addEntry.error && (
        <p className="text-sm text-destructive">{addEntry.error.message}</p>
      )}

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={addEntry.isPending}
      >
        {addEntry.isPending && (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        )}
        {todayEntry ? "Update Today's Log" : "Save Log"}
      </Button>
    </div>
  );
}
