"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CompoundCategory, LegalStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCategory } from "@/lib/utils";
import { CompoundCard } from "./CompoundCard";
import type { CompoundSummary } from "./types";

export interface CategoryCount {
  category: CompoundCategory;
  count: number;
}

interface Props {
  compounds: CompoundSummary[];
  categories: CategoryCount[];
}

const LEGAL_STATUS_OPTIONS: { value: LegalStatus; label: string }[] = [
  { value: "LEGAL", label: "OTC / Legal" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "GRAY_MARKET", label: "Gray Market" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "RESEARCH_ONLY", label: "Research Only" },
];

const PHASE_OPTIONS = [
  { value: "Preclinical", label: "Preclinical" },
  { value: "Phase I", label: "Phase I" },
  { value: "Phase II", label: "Phase II" },
  { value: "Phase III", label: "Phase III" },
  { value: "Approved", label: "Approved" },
];

type SortKey = "evidenceScore" | "name" | "studyCount";

export function CompoundFilters({ compounds, categories }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    Set<CompoundCategory>
  >(new Set());
  const [selectedLegal, setSelectedLegal] = useState<Set<LegalStatus>>(
    new Set()
  );
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<SortKey>("evidenceScore");
  const [showFilters, setShowFilters] = useState(false);

  const legalStatusesInData = useMemo(
    () => new Set(compounds.map((c) => c.legalStatus)),
    [compounds]
  );

  const phasesInData = useMemo(() => {
    const phases = new Set<string>();
    for (const c of compounds) {
      if (c.clinicalPhase && c.clinicalPhase !== "No formal trials") {
        phases.add(c.clinicalPhase);
      }
    }
    return phases;
  }, [compounds]);

  const filtered = useMemo(() => {
    let result = compounds;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.aliases.some((a) => a.toLowerCase().includes(q)) ||
          c.mechanismShort?.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.size > 0) {
      result = result.filter((c) => selectedCategories.has(c.category));
    }

    if (selectedLegal.size > 0) {
      result = result.filter((c) => selectedLegal.has(c.legalStatus));
    }

    if (selectedPhases.size > 0) {
      result = result.filter(
        (c) => c.clinicalPhase != null && selectedPhases.has(c.clinicalPhase)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "studyCount") {
        return b.studyCount - a.studyCount;
      }
      // evidenceScore: nulls last
      if (a.evidenceScore === null && b.evidenceScore === null) return 0;
      if (a.evidenceScore === null) return 1;
      if (b.evidenceScore === null) return -1;
      return b.evidenceScore - a.evidenceScore;
    });
  }, [compounds, search, selectedCategories, selectedLegal, selectedPhases, sortBy]);

  const activeFilterCount =
    selectedCategories.size + selectedLegal.size + selectedPhases.size;

  function toggleCategory(cat: CompoundCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleLegal(status: LegalStatus) {
    setSelectedLegal((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function togglePhase(phase: string) {
    setSelectedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  function clearAll() {
    setSelectedCategories(new Set());
    setSelectedLegal(new Set());
    setSelectedPhases(new Set());
    setSearch("");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search compounds, aliases, mechanisms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortKey)}
        >
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="evidenceScore">Evidence Score</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="studyCount">Study Count</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 relative"
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-lg border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Category */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Category
            </h3>
            <div className="space-y-2">
              {categories.map(({ category, count }) => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={selectedCategories.has(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <Label
                    htmlFor={`cat-${category}`}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    {formatCategory(category)}
                    <span className="ml-1.5 text-muted-foreground text-xs">
                      ({count})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Legal status */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Legal Status
            </h3>
            <div className="space-y-2">
              {LEGAL_STATUS_OPTIONS.filter((opt) =>
                legalStatusesInData.has(opt.value)
              ).map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`legal-${value}`}
                    checked={selectedLegal.has(value)}
                    onCheckedChange={() => toggleLegal(value)}
                  />
                  <Label
                    htmlFor={`legal-${value}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Phase */}
          {phasesInData.size > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Clinical Phase
              </h3>
              <div className="space-y-2">
                {PHASE_OPTIONS.filter((opt) =>
                  phasesInData.has(opt.value)
                ).map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`phase-${value}`}
                      checked={selectedPhases.has(value)}
                      onCheckedChange={() => togglePhase(value)}
                    />
                    <Label
                      htmlFor={`phase-${value}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeFilterCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} compound{filtered.length !== 1 ? "s" : ""}
        {activeFilterCount > 0 || search ? " matching filters" : ""}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((c) => (
          <CompoundCard key={c.id} compound={c} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <p className="text-sm">No compounds match your filters.</p>
            <button
              onClick={clearAll}
              className="mt-2 text-sm underline underline-offset-2 hover:text-foreground"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
