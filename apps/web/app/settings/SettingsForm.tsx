"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  weightUnit: string | null;
  tempUnit: string | null;
  createdAt: string;
  _count: { stacks: number; cycles: number };
}

export function SettingsForm({ user }: { user: UserData }) {
  const router = useRouter();
  const [weightUnit, setWeightUnit] = useState(user.weightUnit ?? "lbs");
  const [tempUnit, setTempUnit] = useState(user.tempUnit ?? "F");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const updatePrefs = trpc.user.updatePreferences.useMutation({
    onSuccess: () => router.refresh(),
  });

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut({ callbackUrl: "/" });
    },
  });

  function handleWeightToggle() {
    const next = weightUnit === "lbs" ? "kg" : "lbs";
    setWeightUnit(next);
    updatePrefs.mutate({ weightUnit: next as "lbs" | "kg" });
  }

  function handleTempToggle() {
    const next = tempUnit === "F" ? "C" : "F";
    setTempUnit(next);
    updatePrefs.mutate({ tempUnit: next as "F" | "C" });
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-lg">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.name ?? "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4 text-sm">
            <Link
              href="/stacks"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-semibold text-foreground">{user._count.stacks}</span> stacks
            </Link>
            <Link
              href="/cycles"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-semibold text-foreground">{user._count.cycles}</span> cycles
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Unit preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Weight</p>
              <p className="text-xs text-muted-foreground">Used in cycle tracking</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWeightToggle}
              disabled={updatePrefs.isPending}
              className="w-16"
            >
              {weightUnit}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Temperature</p>
              <p className="text-xs text-muted-foreground">Used in cycle tracking</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTempToggle}
              disabled={updatePrefs.isPending}
              className="w-16"
            >
              °{tempUnit}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          {!deleteConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will delete your account. Your public stacks will remain visible. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAccount.mutate()}
                  disabled={deleteAccount.isPending}
                >
                  {deleteAccount.isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
