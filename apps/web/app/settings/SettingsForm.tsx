"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import { calcLBM, type Sex } from "@/lib/dose-utils";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  weightUnit: string | null;
  tempUnit: string | null;
  sex: "MALE" | "FEMALE" | null;
  weightLbs: number | null;
  heightFt: number | null;
  heightIn: number | null;
  createdAt: string;
  _count: { stacks: number; cycles: number };
}

export function SettingsForm({ user }: { user: UserData }) {
  const router = useRouter();
  const [weightUnit, setWeightUnit] = useState(user.weightUnit ?? "lbs");
  const [tempUnit, setTempUnit] = useState(user.tempUnit ?? "F");
  const [sex, setSex] = useState<"MALE" | "FEMALE" | null>(user.sex ?? null);
  const [weightLbs, setWeightLbs] = useState(
    user.weightLbs != null ? String(user.weightLbs) : "",
  );
  const [heightFt, setHeightFt] = useState(
    user.heightFt != null ? String(user.heightFt) : "",
  );
  const [heightIn, setHeightIn] = useState(
    user.heightIn != null ? String(user.heightIn) : "",
  );
  const [bioSaved, setBioSaved] = useState(false);
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

  function handleBioSave() {
    const ft = parseInt(heightFt, 10);
    const inches = parseInt(heightIn, 10);
    const lbs = parseFloat(weightLbs);
    updatePrefs.mutate(
      {
        sex: sex ?? undefined,
        weightLbs: isNaN(lbs) ? undefined : lbs,
        heightFt: isNaN(ft) ? undefined : ft,
        heightIn: isNaN(inches) ? undefined : inches,
      },
      { onSuccess: () => { setBioSaved(true); setTimeout(() => setBioSaved(false), 3000); router.refresh(); } },
    );
  }

  const bioComplete =
    sex != null &&
    weightLbs !== "" &&
    heightFt !== "" &&
    heightIn !== "" &&
    !isNaN(parseFloat(weightLbs)) &&
    !isNaN(parseInt(heightFt, 10)) &&
    !isNaN(parseInt(heightIn, 10));

  const lbmDisplay = bioComplete
    ? Math.round(
        calcLBM(
          sex as Sex,
          parseFloat(weightLbs),
          parseInt(heightFt, 10),
          parseInt(heightIn, 10),
        ),
      )
    : null;

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

      {/* Body Composition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Body Composition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Used to personalize dosing estimates. Never shared.
          </p>

          {/* Sex */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Biological Sex</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={sex === "MALE" ? "default" : "outline"}
                size="sm"
                onClick={() => setSex("MALE")}
                className="w-20"
              >
                Male
              </Button>
              <Button
                variant={sex === "FEMALE" ? "default" : "outline"}
                size="sm"
                onClick={() => setSex("FEMALE")}
                className="w-20"
              >
                Female
              </Button>
            </div>
          </div>

          {/* Weight */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Weight</p>
              <p className="text-xs text-muted-foreground">pounds</p>
            </div>
            <Input
              type="number"
              placeholder="e.g. 175"
              value={weightLbs}
              onChange={(e) => setWeightLbs(e.target.value)}
              className="w-28 text-right"
              min={50}
              max={700}
            />
          </div>

          {/* Height */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Height</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="5"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                className="w-16 text-right"
                min={3}
                max={8}
              />
              <span className="text-sm text-muted-foreground">ft</span>
              <Input
                type="number"
                placeholder="10"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                className="w-16 text-right"
                min={0}
                max={11}
              />
              <span className="text-sm text-muted-foreground">in</span>
            </div>
          </div>

          {lbmDisplay != null && (
            <p className="text-xs text-muted-foreground">
              Estimated LBM: <span className="font-semibold text-foreground">{lbmDisplay} kg</span>
            </p>
          )}

          <Button
            size="sm"
            onClick={handleBioSave}
            disabled={updatePrefs.isPending}
          >
            {bioSaved ? "Saved" : updatePrefs.isPending ? "Saving..." : "Save"}
          </Button>
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
