import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { Calendar, BookOpen } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { CycleSummary } from "./types";

interface Props {
  cycle: CycleSummary;
}

export function CycleCard({ cycle }: Props) {
  const today = new Date();
  const startDate = cycle.startDate ? new Date(cycle.startDate) : null;
  const endDate = cycle.endDate ? new Date(cycle.endDate) : null;

  const daysIn =
    startDate && cycle.status === "ACTIVE"
      ? differenceInDays(today, startDate) + 1
      : null;

  const totalDays =
    startDate && endDate
      ? differenceInDays(endDate, startDate) + 1
      : null;

  const progressPct =
    daysIn != null && totalDays != null
      ? Math.max(0, Math.min(Math.round((daysIn / totalDays) * 100), 100))
      : null;

  return (
    <Link
      href={`/cycles/${cycle.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-tight truncate">
            {cycle.name}
          </h3>
          {cycle.stack && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {cycle.stack.name}
            </p>
          )}
        </div>
        <StatusBadge status={cycle.status} />
      </div>

      {progressPct != null && totalDays != null && daysIn != null && (
        <div className="mb-2.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Day {daysIn} of {totalDays} · {progressPct}%
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {startDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(startDate, "MMM d, yyyy")}
            {endDate && <> → {format(endDate, "MMM d, yyyy")}</>}
          </span>
        )}
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {cycle._count.entries}{" "}
          {cycle._count.entries === 1 ? "entry" : "entries"}
        </span>
        {cycle.lastEntryDate && (
          <span>Last log: {format(new Date(cycle.lastEntryDate), "MMM d")}</span>
        )}
      </div>
    </Link>
  );
}
