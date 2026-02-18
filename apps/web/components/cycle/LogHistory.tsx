"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CycleEntryData } from "./types";

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

interface Props {
  entries: CycleEntryData[];
}

export function LogHistory({ entries }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No entries yet.
      </p>
    );
  }

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-1">
      {sorted.map((entry) => {
        const expanded = expandedIds.has(entry.id);
        return (
          <div key={entry.id} className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent/30 transition-colors text-left"
              onClick={() => toggle(entry.id)}
            >
              <div className="flex items-center gap-3">
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="font-medium">
                  {format(new Date(entry.date), "EEE, MMM d")}
                </span>
                {entry.weight != null && (
                  <span className="text-xs text-muted-foreground">
                    {entry.weight} kg
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {entry.mood != null && <span>M:{entry.mood}</span>}
                {entry.energy != null && <span>E:{entry.energy}</span>}
                {entry.libido != null && <span>L:{entry.libido}</span>}
                {entry.symptoms.length > 0 && (
                  <span className="text-destructive/70">
                    {entry.symptoms.length} symptom
                    {entry.symptoms.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </button>

            {expanded && (
              <div className="px-3 pb-3 border-t bg-muted/20 space-y-2 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {entry.weight != null && (
                    <div>
                      <span className="text-muted-foreground">Weight</span>
                      <p className="font-medium">{entry.weight} kg</p>
                    </div>
                  )}
                  {entry.restingHR != null && (
                    <div>
                      <span className="text-muted-foreground">Resting HR</span>
                      <p className="font-medium">{entry.restingHR} bpm</p>
                    </div>
                  )}
                  {entry.bloodPressure && (
                    <div>
                      <span className="text-muted-foreground">BP</span>
                      <p className="font-medium">{entry.bloodPressure}</p>
                    </div>
                  )}
                  {entry.sleepHours != null && (
                    <div>
                      <span className="text-muted-foreground">Sleep</span>
                      <p className="font-medium">{entry.sleepHours} hrs</p>
                    </div>
                  )}
                </div>

                {(entry.mood != null ||
                  entry.energy != null ||
                  entry.libido != null ||
                  entry.sleepQuality != null ||
                  entry.appetite != null) && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                    {(
                      [
                        [entry.mood, "Mood"],
                        [entry.energy, "Energy"],
                        [entry.libido, "Libido"],
                        [entry.sleepQuality, "Sleep Q"],
                        [entry.appetite, "Appetite"],
                      ] as [number | null, string][]
                    )
                      .filter(([val]) => val != null)
                      .map(([val, label]) => (
                        <div key={label}>
                          <span className="text-muted-foreground">{label}</span>
                          <p className="font-medium">{val}/10</p>
                        </div>
                      ))}
                  </div>
                )}

                {entry.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.symptoms.map((s) => (
                      <span
                        key={s}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          "bg-destructive/10 text-destructive"
                        )}
                      >
                        {SYMPTOM_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                )}

                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {entry.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
