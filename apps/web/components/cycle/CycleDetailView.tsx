"use client";

import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodayLog } from "./TodayLog";
import { ProgressCharts } from "./ProgressCharts";
import { BloodworkSection } from "./BloodworkSection";
import { LogHistory } from "./LogHistory";
import type { CycleData, CycleEntryData, BloodworkData } from "./types";

interface Props {
  cycle: CycleData;
}

export function CycleDetailView({ cycle: initial }: Props) {
  const [entries, setEntries] = useState<CycleEntryData[]>(initial.entries);
  const [bloodwork, setBloodwork] = useState<BloodworkData[]>(
    initial.bloodwork
  );

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayStr = todayMidnight.toISOString();

  const todayEntry =
    entries.find((e) => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      return d.toISOString() === todayStr;
    }) ?? null;

  function handleEntryAdded(entry: CycleEntryData) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => {
        const d = new Date(e.date);
        d.setHours(0, 0, 0, 0);
        return d.toISOString() === todayStr;
      });
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
  }

  function handleBloodworkAdded(panel: BloodworkData) {
    setBloodwork((prev) => [...prev, panel]);
  }

  const startDate = initial.startDate ? new Date(initial.startDate) : null;
  const endDate = initial.endDate ? new Date(initial.endDate) : null;
  const today = new Date();

  const daysIn = startDate ? differenceInDays(today, startDate) + 1 : null;
  const totalDays =
    startDate && endDate ? differenceInDays(endDate, startDate) + 1 : null;
  const progressPct =
    daysIn != null && totalDays != null
      ? Math.max(0, Math.min(Math.round((daysIn / totalDays) * 100), 100))
      : null;

  return (
    <div className="space-y-6">
      {/* Progress bar — only for active cycles with known duration */}
      {initial.status === "ACTIVE" &&
        progressPct != null &&
        daysIn != null &&
        totalDays != null &&
        startDate &&
        endDate && (
          <div className="rounded-lg border p-4 bg-card">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium">
                Day {daysIn} of {totalDays}
              </span>
              <span className="text-muted-foreground">
                {progressPct}% complete
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>{format(startDate, "MMM d")}</span>
              <span>{format(endDate, "MMM d")}</span>
            </div>
          </div>
        )}

      <Tabs defaultValue="log">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="log">Log</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="bloodwork">Bloodwork</TabsTrigger>
          <TabsTrigger value="history">
            History
            {entries.length > 0 && (
              <span className="ml-1.5 text-xs opacity-60">
                ({entries.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="pt-4">
          <TodayLog
            cycle={initial}
            todayEntry={todayEntry}
            onEntryAdded={handleEntryAdded}
          />
        </TabsContent>

        <TabsContent value="charts" className="pt-4">
          <ProgressCharts entries={entries} />
        </TabsContent>

        <TabsContent value="bloodwork" className="pt-4">
          <BloodworkSection
            cycleId={initial.id}
            panels={bloodwork}
            onPanelAdded={handleBloodworkAdded}
          />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <LogHistory entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
