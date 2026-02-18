import { Zap } from "lucide-react";
import type { MechanismData } from "./types";

interface Props {
  mechanisms: MechanismData[];
}

export function MechanismsList({ mechanisms }: Props) {
  if (mechanisms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No mechanism data indexed yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {mechanisms.map((m) => (
        <div
          key={m.id}
          className="flex gap-3 rounded-lg border bg-card px-4 py-3"
        >
          <div className="mt-0.5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium capitalize leading-snug">
              {m.pathway.replace(/_/g, " ")}
            </p>
            {m.description && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {m.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
