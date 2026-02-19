"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface Props {
  stackId: string;
  initialCount: number;
  initialHasUpvoted: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function UpvoteButton({
  stackId,
  initialCount,
  initialHasUpvoted,
  size = "md",
  className,
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);

  const upvote = trpc.stack.upvote.useMutation({
    onMutate: () => {
      // Optimistic update
      if (hasUpvoted) {
        setCount((c) => c - 1);
        setHasUpvoted(false);
      } else {
        setCount((c) => c + 1);
        setHasUpvoted(true);
      }
    },
    onError: () => {
      // Revert on error
      if (hasUpvoted) {
        setCount((c) => c + 1);
        setHasUpvoted(true);
      } else {
        setCount((c) => c - 1);
        setHasUpvoted(false);
      }
    },
  });

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        upvote.mutate({ stackId });
      }}
      disabled={upvote.isPending}
      aria-label={hasUpvoted ? "Remove upvote" : "Upvote"}
      className={cn(
        "flex items-center gap-1 rounded transition-colors",
        size === "sm"
          ? "text-xs px-1.5 py-0.5"
          : "text-sm px-2.5 py-1.5 border",
        hasUpvoted
          ? "text-primary border-primary bg-primary/5 hover:bg-primary/10"
          : "text-muted-foreground border-border hover:text-foreground hover:bg-accent",
        className
      )}
    >
      <ArrowUp
        className={cn(
          size === "sm" ? "h-3 w-3" : "h-4 w-4",
          hasUpvoted && "fill-current"
        )}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
