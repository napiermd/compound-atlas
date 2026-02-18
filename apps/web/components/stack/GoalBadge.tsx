import type { StackGoal } from "@prisma/client";
import { formatCategory } from "@/lib/utils";
import { cn } from "@/lib/utils";

const goalStyles: Record<StackGoal, string> = {
  RECOMP:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  BULK: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CUT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  COGNITIVE:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  SLEEP:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  LONGEVITY:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  RECOVERY:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  JOINT_HEALTH:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  MOOD: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  LIBIDO:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  GENERAL_HEALTH:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300",
  CUSTOM:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300",
};

interface Props {
  goal: StackGoal;
  className?: string;
  size?: "sm" | "md";
}

export function GoalBadge({ goal, className, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium capitalize",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        goalStyles[goal] ?? goalStyles.CUSTOM,
        className
      )}
    >
      {formatCategory(goal)}
    </span>
  );
}
