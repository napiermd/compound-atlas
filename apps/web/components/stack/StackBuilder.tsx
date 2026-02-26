"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import { CompoundPicker } from "./CompoundPicker";
import { CompoundRow } from "./CompoundRow";
import { InteractionWarnings } from "./InteractionWarnings";
import { EvidenceSummary } from "./EvidenceSummary";
import type { CompoundOption, StackedCompound, UpdatableField } from "./types";
import type { StackGoal } from "@prisma/client";

const STACK_GOALS: { value: StackGoal; label: string }[] = [
  { value: "COGNITIVE", label: "Cognitive" },
  { value: "SLEEP", label: "Sleep" },
  { value: "MOOD", label: "Mood" },
  { value: "RECOMP", label: "Recomp" },
  { value: "BULK", label: "Bulk" },
  { value: "CUT", label: "Cut" },
  { value: "RECOVERY", label: "Recovery" },
  { value: "LONGEVITY", label: "Longevity" },
  { value: "JOINT_HEALTH", label: "Joint Health" },
  { value: "LIBIDO", label: "Libido" },
  { value: "GENERAL_HEALTH", label: "General Health" },
  { value: "CUSTOM", label: "Custom" },
];

interface Props {
  compounds: CompoundOption[];
}

export function StackBuilder({ compounds }: Props) {
  const router = useRouter();

  // Metadata
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<StackGoal>("COGNITIVE");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [riskFlags, setRiskFlags] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Stacked compounds
  const [stackedCompounds, setStackedCompounds] = useState<StackedCompound[]>(
    []
  );

  const addedIds = useMemo(
    () => new Set(stackedCompounds.map((c) => c.compoundId)),
    [stackedCompounds]
  );

  const compoundIds = useMemo(
    () => stackedCompounds.map((c) => c.compoundId),
    [stackedCompounds]
  );

  // Interactions query — re-runs whenever compoundIds changes
  const { data: interactionsData, isLoading: interactionsLoading } =
    trpc.stack.getInteractions.useQuery(
      { compoundIds },
      { enabled: compoundIds.length >= 2 }
    );

  // Save
  const createStack = trpc.stack.create.useMutation({
    onSuccess: (stack) => router.push(`/stacks/${stack.slug}`),
  });

  // Handlers
  function handleAdd(compound: CompoundOption) {
    setStackedCompounds((prev) => [
      ...prev,
      {
        rowId: compound.id,
        compoundId: compound.id,
        name: compound.name,
        category: compound.category,
        evidenceScore: compound.evidenceScore,
        dose: "",
        unit: compound.doseUnit ?? "mg",
        frequency: "daily",
        startWeek: "",
        endWeek: "",
        notes: "",
        notesOpen: false,
      },
    ]);
  }

  function handleRemove(rowId: string) {
    setStackedCompounds((prev) => prev.filter((c) => c.rowId !== rowId));
  }

  function handleUpdate(rowId: string, field: UpdatableField, value: string) {
    setStackedCompounds((prev) =>
      prev.map((c) => (c.rowId === rowId ? { ...c, [field]: value } : c))
    );
  }

  function handleMove(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= stackedCompounds.length) return;
    setStackedCompounds((prev) => {
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }

  function handleToggleNotes(rowId: string) {
    setStackedCompounds((prev) =>
      prev.map((c) =>
        c.rowId === rowId ? { ...c, notesOpen: !c.notesOpen } : c
      )
    );
  }

  function handleSave() {
    createStack.mutate({
      name: name.trim(),
      goal,
      description: description.trim() || undefined,
      durationWeeks: durationWeeks ? parseInt(durationWeeks) : undefined,
      folder: folder.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      riskFlags: riskFlags
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      isPublic,
      compounds: stackedCompounds.map((c) => ({
        compoundId: c.compoundId,
        dose: c.dose ? parseFloat(c.dose) : undefined,
        unit: c.unit || undefined,
        frequency: c.frequency || undefined,
        startWeek: c.startWeek ? parseInt(c.startWeek) : undefined,
        endWeek: c.endWeek ? parseInt(c.endWeek) : undefined,
        notes: c.notes.trim() || undefined,
      })),
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Compound picker */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Compounds</h2>
          {stackedCompounds.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {stackedCompounds.length}
            </span>
          )}
        </div>
        <CompoundPicker
          compounds={compounds}
          addedIds={addedIds}
          onAdd={handleAdd}
        />
      </div>

      {/* 2. Compound rows */}
      {stackedCompounds.length > 0 ? (
        <div className="space-y-2">
          {stackedCompounds.map((c, i) => (
            <CompoundRow
              key={c.rowId}
              compound={c}
              index={i}
              total={stackedCompounds.length}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
              onMove={handleMove}
              onToggleNotes={handleToggleNotes}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center border-2 border-dashed rounded-lg text-muted-foreground">
          <PlusCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">
            Search for a compound above to add it to your stack
          </p>
        </div>
      )}

      {/* 3. Interaction warnings */}
      {stackedCompounds.length >= 2 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Interactions</h2>
          <InteractionWarnings
            interactions={interactionsData ?? []}
            isLoading={interactionsLoading}
          />
        </div>
      )}

      {/* 4. Evidence summary */}
      {stackedCompounds.length > 0 && (
        <EvidenceSummary compounds={stackedCompounds} />
      )}

      <Separator />

      {/* 5. Stack metadata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stack Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="stack-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cognitive Enhancement Stack"
            />
          </div>

          {/* Goal + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stack-goal">Goal</Label>
              <Select
                value={goal}
                onValueChange={(v) => setGoal(v as StackGoal)}
              >
                <SelectTrigger id="stack-goal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STACK_GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stack-duration">Duration (weeks)</Label>
              <Input
                id="stack-duration"
                type="number"
                min="1"
                max="52"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="stack-desc">Description</Label>
            <textarea
              id="stack-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="Describe the protocol — target goals, rationale, timing notes, who it's for."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stack-folder">Folder</Label>
              <Input
                id="stack-folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. Morning protocols"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stack-tags">Tags (comma-separated)</Label>
              <Input
                id="stack-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="focus, workday, minimal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stack-risk">Risk Flags (comma-separated)</Label>
            <Input
              id="stack-risk"
              value={riskFlags}
              onChange={(e) => setRiskFlags(e.target.value)}
              placeholder="stimulant load, sleep disruption"
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="stack-public"
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(!!v)}
            />
            <Label
              htmlFor="stack-public"
              className="cursor-pointer font-normal"
            >
              Make public — share with the community
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {createStack.error && (
        <p className="text-sm text-destructive">{createStack.error.message}</p>
      )}

      {/* Save */}
      <Button
        className="w-full"
        size="lg"
        disabled={!name.trim() || createStack.isPending}
        onClick={handleSave}
      >
        {createStack.isPending ? "Saving..." : "Save Stack"}
      </Button>
    </div>
  );
}
