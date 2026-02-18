import { cn } from "@/lib/utils";

const statusConfig = {
  ACTIVE: {
    label: "Active",
    className:
      "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  },
  PLANNED: {
    label: "Planned",
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30",
  },
  PAUSED: {
    label: "Paused",
    className:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  ABORTED: {
    label: "Aborted",
    className:
      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  },
} as const;

interface Props {
  status: keyof typeof statusConfig;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs",
        className
      )}
    >
      {label}
    </span>
  );
}
