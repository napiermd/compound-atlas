"use client";

import { ChevronUp, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import type { StackedCompound, UpdatableField } from "./types";

const UNITS = ["mg", "mcg", "g", "IU", "mL"];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "2x/day", label: "2x/day" },
  { value: "3x/day", label: "3x/day" },
  { value: "2x/week", label: "2x/week" },
  { value: "3x/week", label: "3x/week" },
  { value: "M/W/F", label: "M/W/F" },
  { value: "weekly", label: "Weekly" },
  { value: "as needed", label: "As needed" },
];

interface Props {
  compound: StackedCompound;
  index: number;
  total: number;
  onRemove: (rowId: string) => void;
  onUpdate: (rowId: string, field: UpdatableField, value: string) => void;
  onMove: (fromIndex: number, direction: -1 | 1) => void;
  onToggleNotes: (rowId: string) => void;
}

export function CompoundRow({
  compound: c,
  index,
  total,
  onRemove,
  onUpdate,
  onMove,
  onToggleNotes,
}: Props) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      {/* Name row */}
      <div className="flex items-center gap-2">
        {/* Reorder handles */}
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{c.name}</span>
          <EvidenceScoreBadge score={c.evidenceScore} />
          <CategoryBadge category={c.category} />
        </div>

        <button
          type="button"
          onClick={() => onRemove(c.rowId)}
          className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
          aria-label="Remove compound"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center pl-7">
        {/* Dose + unit */}
        <div className="flex gap-1">
          <Input
            type="number"
            value={c.dose}
            onChange={(e) => onUpdate(c.rowId, "dose", e.target.value)}
            placeholder="Dose"
            className="w-20 h-8 text-sm"
            min="0"
          />
          <Select
            value={c.unit}
            onValueChange={(v) => onUpdate(c.rowId, "unit", v)}
          >
            <SelectTrigger className="w-16 h-8 text-sm">
              <SelectValue placeholder="unit" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Frequency */}
        <Select
          value={c.frequency}
          onValueChange={(v) => onUpdate(c.rowId, "frequency", v)}
        >
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue placeholder="Frequency" />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Week range */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={c.startWeek}
            onChange={(e) => onUpdate(c.rowId, "startWeek", e.target.value)}
            placeholder="Wk 1"
            className="w-16 h-8 text-sm"
            min="1"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="number"
            value={c.endWeek}
            onChange={(e) => onUpdate(c.rowId, "endWeek", e.target.value)}
            placeholder="Wk ∞"
            className="w-16 h-8 text-sm"
            min="1"
          />
        </div>

        {/* Notes toggle */}
        <button
          type="button"
          onClick={() => onToggleNotes(c.rowId)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {c.notesOpen ? "hide notes" : "+ notes"}
        </button>
      </div>

      {/* Notes textarea */}
      {c.notesOpen && (
        <div className="pl-7">
          <textarea
            value={c.notes}
            onChange={(e) => onUpdate(c.rowId, "notes", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder="Optional notes for this compound (timing, rationale, source, etc.)"
          />
        </div>
      )}
    </div>
  );
}
