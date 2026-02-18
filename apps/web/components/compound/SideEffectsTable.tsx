import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SideEffectData } from "./types";

const severityStyles: Record<string, string> = {
  mild: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  moderate:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  severe: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const frequencyStyles: Record<string, string> = {
  very_common: "text-red-600 dark:text-red-400 font-medium",
  common: "text-orange-600 dark:text-orange-400",
  uncommon: "text-muted-foreground",
  rare: "text-muted-foreground opacity-70",
};

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        severityStyles[severity] ??
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      )}
    >
      {severity}
    </span>
  );
}

interface Props {
  sideEffects: SideEffectData[];
}

export function SideEffectsTable({ sideEffects }: Props) {
  if (sideEffects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No side effect data indexed yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Effect</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead className="hidden sm:table-cell">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sideEffects.map((se) => (
          <TableRow key={se.id}>
            <TableCell className="font-medium capitalize">
              {se.name.replace(/_/g, " ")}
            </TableCell>
            <TableCell>
              <SeverityBadge severity={se.severity} />
            </TableCell>
            <TableCell>
              {se.frequency && (
                <span
                  className={cn(
                    "text-sm capitalize",
                    frequencyStyles[se.frequency] ?? "text-muted-foreground"
                  )}
                >
                  {se.frequency.replace(/_/g, " ")}
                </span>
              )}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-xs">
              {se.notes}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
