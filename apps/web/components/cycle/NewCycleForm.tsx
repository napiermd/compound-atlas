"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface StackOption {
  id: string;
  name: string;
  slug: string;
  durationWeeks: number | null;
}

interface Props {
  stacks: StackOption[];
}

type Mode = "stack" | "freeform";

export function NewCycleForm({ stacks }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("stack");
  const [selectedStackId, setSelectedStackId] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  function computeEndDate(start: string, durationWeeks: number): string {
    const d = new Date(start + "T00:00:00");
    d.setDate(d.getDate() + durationWeeks * 7 - 1);
    return d.toISOString().slice(0, 10);
  }

  function handleStackSelect(id: string) {
    setSelectedStackId(id);
    const stack = stacks.find((s) => s.id === id);
    if (stack) {
      setName(stack.name);
      if (stack.durationWeeks && startDate) {
        setEndDate(computeEndDate(startDate, stack.durationWeeks));
      }
    }
  }

  function handleStartDateChange(val: string) {
    setStartDate(val);
    const stack = stacks.find((s) => s.id === selectedStackId);
    if (stack?.durationWeeks && val) {
      setEndDate(computeEndDate(val, stack.durationWeeks));
    }
  }

  const createCycle = trpc.cycle.create.useMutation({
    onSuccess: (cycle) => router.push(`/cycles/${cycle.id}`),
  });

  function handleSubmit() {
    createCycle.mutate({
      name: name.trim(),
      stackId:
        mode === "stack" && selectedStackId ? selectedStackId : undefined,
      startDate: startDate ? new Date(startDate + "T00:00:00") : undefined,
      endDate: endDate ? new Date(endDate + "T00:00:00") : undefined,
      notes: notes.trim() || undefined,
    });
  }

  const canSubmit =
    name.trim().length > 0 &&
    (mode === "freeform" || selectedStackId !== "") &&
    !createCycle.isPending;

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
        {(["stack", "freeform"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              if (m === "freeform") setSelectedStackId("");
            }}
            className={cn(
              "rounded-md py-2 text-sm font-medium transition-colors",
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "stack" ? "From Stack" : "Freeform"}
          </button>
        ))}
      </div>

      {/* Stack selector */}
      {mode === "stack" && (
        <div className="space-y-1.5">
          <Label>Stack</Label>
          {stacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any stacks yet.{" "}
              <a href="/stacks/new" className="underline">
                Build one first.
              </a>
            </p>
          ) : (
            <Select value={selectedStackId} onValueChange={handleStackSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a stack..." />
              </SelectTrigger>
              <SelectContent>
                {stacks.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.durationWeeks && (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        ({s.durationWeeks}w)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="cycle-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cycle-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cognitive Stack — Q1 2026"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cycle-start">Start Date</Label>
          <Input
            id="cycle-start"
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cycle-end">End Date</Label>
          <Input
            id="cycle-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="cycle-notes">Notes</Label>
        <Textarea
          id="cycle-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Goals, context, anything to track..."
          rows={3}
          className="resize-none"
        />
      </div>

      {createCycle.error && (
        <p className="text-sm text-destructive">{createCycle.error.message}</p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {createCycle.isPending ? "Starting..." : "Start Cycle"}
      </Button>
    </div>
  );
}
