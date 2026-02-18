"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import type { CompoundOption } from "./types";

interface Props {
  compounds: CompoundOption[];
  addedIds: Set<string>;
  onAdd: (compound: CompoundOption) => void;
}

export function CompoundPicker({ compounds, addedIds, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = compounds
    .filter(
      (c) =>
        !addedIds.has(c.id) &&
        (search.length === 0 ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.includes(search.toLowerCase()))
    )
    .slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(compound: CompoundOption) {
    onAdd(compound);
    setSearch("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search compounds to add..."
          className="pl-9"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-md border bg-popover shadow-lg overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent text-left transition-colors"
            >
              <span className="flex-1 font-medium min-w-0 truncate">
                {c.name}
              </span>
              <CategoryBadge category={c.category} />
              <EvidenceScoreBadge score={c.evidenceScore} />
            </button>
          ))}
        </div>
      )}

      {open && search.length > 0 && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-md border bg-popover shadow-lg px-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            No compounds found for &ldquo;{search}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
