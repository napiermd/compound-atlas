"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";
import type { BloodworkData } from "./types";

const BLOODWORK_MARKERS = [
  { key: "testosterone_total", label: "Testosterone Total (ng/dL)" },
  { key: "testosterone_free", label: "Testosterone Free (pg/mL)" },
  { key: "estradiol", label: "Estradiol (pg/mL)" },
  { key: "shbg", label: "SHBG (nmol/L)" },
  { key: "prolactin", label: "Prolactin (ng/mL)" },
  { key: "hematocrit", label: "Hematocrit (%)" },
  { key: "hemoglobin", label: "Hemoglobin (g/dL)" },
  { key: "alt", label: "ALT (U/L)" },
  { key: "ast", label: "AST (U/L)" },
  { key: "hdl", label: "HDL (mg/dL)" },
  { key: "ldl", label: "LDL (mg/dL)" },
  { key: "triglycerides", label: "Triglycerides (mg/dL)" },
  { key: "fasting_glucose", label: "Fasting Glucose (mg/dL)" },
  { key: "creatinine", label: "Creatinine (mg/dL)" },
  { key: "egfr", label: "eGFR (mL/min/1.73m²)" },
] as const;

interface Props {
  cycleId: string;
  panels: BloodworkData[];
  onPanelAdded: (panel: BloodworkData) => void;
}

export function BloodworkSection({ cycleId, panels, onPanelAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [labName, setLabName] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  function setMarker(key: string, value: string) {
    setResults((prev) => ({ ...prev, [key]: value }));
  }

  const addBloodwork = trpc.cycle.addBloodwork.useMutation({
    onSuccess: (result) => {
      onPanelAdded({
        ...result,
        date: result.date.toISOString(),
        results: result.results as Record<string, number | null>,
      });
      setOpen(false);
      setResults({});
      setLabName("");
      setNotes("");
    },
  });

  function handleSubmit() {
    const parsedResults: Record<string, number | null> = {};
    for (const [key, val] of Object.entries(results)) {
      if (val.trim() !== "") {
        parsedResults[key] = parseFloat(val);
      }
    }
    if (Object.keys(parsedResults).length === 0) return;

    addBloodwork.mutate({
      cycleId,
      date: new Date(date + "T12:00:00"),
      labName: labName.trim() || undefined,
      results: parsedResults,
      notes: notes.trim() || undefined,
    });
  }

  const filledCount = Object.values(results).filter(
    (v) => v.trim() !== ""
  ).length;

  const sorted = [...panels].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {panels.length === 0
            ? "No bloodwork logged yet."
            : `${panels.length} panel${panels.length !== 1 ? "s" : ""} logged`}
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Panel
        </Button>
      </div>

      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((panel) => (
            <div key={panel.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(new Date(panel.date), "MMM d, yyyy")}
                </span>
                {panel.labName && (
                  <span className="text-xs text-muted-foreground">
                    · {panel.labName}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {BLOODWORK_MARKERS.filter(
                  (m) => panel.results[m.key] != null
                ).map((m) => (
                  <div key={m.key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate mr-2">
                      {m.label.split(" (")[0]}
                    </span>
                    <span className="font-medium tabular-nums shrink-0">
                      {panel.results[m.key]}
                    </span>
                  </div>
                ))}
              </div>
              {panel.notes && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {panel.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Bloodwork Panel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bw-date">Date</Label>
                <Input
                  id="bw-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bw-lab">Lab Name</Label>
                <Input
                  id="bw-lab"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder="LabCorp, Quest..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Results (leave blank to skip)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {BLOODWORK_MARKERS.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <Label
                      htmlFor={`bw-${m.key}`}
                      className="text-xs leading-tight"
                    >
                      {m.label}
                    </Label>
                    <Input
                      id={`bw-${m.key}`}
                      type="number"
                      step="0.01"
                      value={results[m.key] ?? ""}
                      onChange={(e) => setMarker(m.key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bw-notes">Notes</Label>
              <Textarea
                id="bw-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fasting? Any notes about the draw..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {addBloodwork.error && (
            <p className="text-sm text-destructive">
              {addBloodwork.error.message}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addBloodwork.isPending || filledCount === 0}
            >
              {addBloodwork.isPending ? "Saving..." : "Save Panel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
