import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StackInteraction } from "./types";

const typeConfig = {
  synergistic: {
    bg: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    icon: CheckCircle,
    iconClass: "text-green-600 dark:text-green-400",
    label: "Synergistic",
  },
  caution: {
    bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
    icon: AlertTriangle,
    iconClass: "text-yellow-600 dark:text-yellow-400",
    label: "Caution",
  },
  antagonistic: {
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
    icon: AlertTriangle,
    iconClass: "text-orange-600 dark:text-orange-400",
    label: "Antagonistic",
  },
  contraindicated: {
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    icon: AlertCircle,
    iconClass: "text-red-600 dark:text-red-400",
    label: "Contraindicated",
  },
} as const;

const sortOrder: Record<string, number> = {
  contraindicated: 0,
  antagonistic: 1,
  caution: 2,
  synergistic: 3,
};

interface Props {
  interactions: StackInteraction[];
  isLoading?: boolean;
}

export function InteractionWarnings({ interactions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-3 border rounded-lg bg-muted/30">
        No known interactions between selected compounds.
      </p>
    );
  }

  const sorted = [...interactions].sort(
    (a, b) =>
      (sortOrder[a.interactionType] ?? 99) -
      (sortOrder[b.interactionType] ?? 99)
  );

  return (
    <div className="space-y-2">
      {sorted.map((i) => {
        const config =
          typeConfig[i.interactionType as keyof typeof typeConfig] ??
          typeConfig.caution;
        const Icon = config.icon;
        return (
          <div
            key={i.id}
            className={cn("flex gap-3 rounded-lg border px-3 py-2.5", config.bg)}
          >
            <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", config.iconClass)} />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {i.source.name} + {i.target.name}
                <span className={cn("ml-2 text-xs font-normal", config.iconClass)}>
                  {config.label}
                </span>
              </p>
              {i.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {i.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
