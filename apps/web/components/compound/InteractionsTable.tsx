import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "./CategoryBadge";
import type { InteractionData } from "./types";

const interactionTypeStyles: Record<string, string> = {
  synergistic:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  antagonistic:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  contraindicated:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  caution:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

function InteractionTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        interactionTypeStyles[type] ??
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      )}
    >
      {type}
    </span>
  );
}

interface Props {
  interactions: InteractionData[];
}

export function InteractionsTable({ interactions }: Props) {
  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No interaction data indexed yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Compound</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interactions.map((i) => (
          <TableRow key={i.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <Link
                  href={`/compounds/${i.target.slug}`}
                  className="flex items-center gap-1 font-medium text-sm hover:underline group"
                >
                  {i.target.name}
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <CategoryBadge category={i.target.category} />
              </div>
            </TableCell>
            <TableCell>
              <InteractionTypeBadge type={i.interactionType} />
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-sm">
              {i.description}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
