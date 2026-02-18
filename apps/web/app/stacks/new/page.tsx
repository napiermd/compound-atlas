"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

const STACK_GOALS = [
  "RECOMP",
  "BULK",
  "CUT",
  "COGNITIVE",
  "SLEEP",
  "LONGEVITY",
  "RECOVERY",
  "JOINT_HEALTH",
  "MOOD",
  "LIBIDO",
  "GENERAL_HEALTH",
  "CUSTOM",
] as const;

type StackGoal = (typeof STACK_GOALS)[number];

export default function NewStackPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<StackGoal>("GENERAL_HEALTH");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const createStack = trpc.stack.create.useMutation({
    onSuccess: (stack) => router.push(`/stacks/${stack.slug}`),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createStack.mutate({
      name,
      goal,
      description: description || undefined,
      durationWeeks: durationWeeks ? parseInt(durationWeeks) : undefined,
      isPublic,
      compounds: [],
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Build a Stack</h1>
        <p className="text-muted-foreground mt-1">
          Create a compound protocol and add compounds once saved.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stack Details</CardTitle>
          <CardDescription>
            Start with the basics — you can add compounds after creating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cognitive Enhancement Stack"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal">Goal</Label>
              <select
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as StackGoal)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {STACK_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g.toLowerCase().replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="What's this stack designed to do? Any notes on rationale or timing."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (weeks)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="52"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="public" className="cursor-pointer">
                Make public
              </Label>
            </div>

            {createStack.error && (
              <p className="text-sm text-destructive">
                {createStack.error.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={!name.trim() || createStack.isPending}
              className="w-full"
            >
              {createStack.isPending ? "Creating..." : "Create Stack"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
