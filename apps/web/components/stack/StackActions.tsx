"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitFork, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpvoteButton } from "./UpvoteButton";
import { trpc } from "@/lib/trpc/client";

interface Props {
  stackId: string;
  stackSlug: string;
  upvoteCount: number;
  userHasUpvoted: boolean;
  isLoggedIn: boolean;
}

export function StackActions({
  stackId,
  stackSlug,
  upvoteCount,
  userHasUpvoted,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const fork = trpc.stack.fork.useMutation({
    onSuccess: (newStack) => {
      router.push(`/stacks/${newStack.slug}`);
    },
  });

  async function handleCopyLink() {
    const url = `${window.location.origin}/stacks/${stackSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2 shrink-0 flex-wrap">
      <UpvoteButton
        stackId={stackId}
        initialCount={upvoteCount}
        initialHasUpvoted={userHasUpvoted}
        size="md"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="gap-1.5"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" />
            Copy Link
          </>
        )}
      </Button>

      {isLoggedIn && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fork.mutate({ stackId })}
          disabled={fork.isPending}
          className="gap-1.5"
        >
          <GitFork className="h-3.5 w-3.5" />
          {fork.isPending ? "Forking..." : "Fork"}
        </Button>
      )}
    </div>
  );
}
