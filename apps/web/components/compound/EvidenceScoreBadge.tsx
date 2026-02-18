import { cn } from "@/lib/utils";

function getScoreStyle(score: number | null): string {
  if (score === null)
    return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  if (score >= 60)
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 30)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

interface Props {
  score: number | null;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "lg";
}

export function EvidenceScoreBadge({
  score,
  className,
  showLabel = false,
  size = "sm",
}: Props) {
  if (size === "lg") {
    return (
      <div className={cn("flex flex-col items-end", className)}>
        <div
          className={cn(
            "text-3xl font-bold tabular-nums leading-none",
            score === null
              ? "text-zinc-400"
              : score >= 60
                ? "text-green-600 dark:text-green-400"
                : score >= 30
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
          )}
        >
          {score != null ? score.toFixed(0) : "—"}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          evidence score
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium tabular-nums",
        getScoreStyle(score),
        className
      )}
    >
      {score != null ? score.toFixed(0) : "N/A"}
      {showLabel && (
        <span className="font-sans font-normal opacity-70">ev</span>
      )}
    </span>
  );
}
