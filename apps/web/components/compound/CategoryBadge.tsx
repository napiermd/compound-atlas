import type { CompoundCategory } from "@prisma/client";
import { formatCategory } from "@/lib/utils";
import { cn } from "@/lib/utils";

const categoryStyles: Record<CompoundCategory, string> = {
  SUPPLEMENT:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  NOOTROPIC:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  PEPTIDE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ANABOLIC: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  SARM: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  GH_SECRETAGOGUE:
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  FAT_LOSS:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  HORMONAL:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  ADAPTOGEN:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  AMINO_ACID:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  VITAMIN_MINERAL:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  OTHER: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300",
};

interface Props {
  category: CompoundCategory;
  className?: string;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, className, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        categoryStyles[category] ?? categoryStyles.OTHER,
        className
      )}
    >
      {formatCategory(category)}
    </span>
  );
}
