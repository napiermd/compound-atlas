"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Activity, Target, FlaskConical } from "lucide-react";

function formatGoal(goal: string) {
  return goal.toLowerCase().replace(/_/g, " ");
}

export function ProfileDashboard() {
  const { data: profile, isLoading: profileLoading } =
    trpc.healthProfile.get.useQuery();
  const { data: labs, isLoading: labsLoading } = trpc.labs.list.useQuery({
    limit: 10,
  });

  if (profileLoading || labsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Health Profile Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set up your profile to get personalized stack recommendations.
          </p>
          <Button asChild>
            <Link href="/profile/setup">Get Started</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Health Profile</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile/setup">Edit Profile</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/stacks/personalized">View Recommendations</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Demographics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {profile.age && <p>Age: {profile.age}</p>}
            {profile.biologicalSex && (
              <p>Sex: {profile.biologicalSex.toLowerCase()}</p>
            )}
            {profile.heightCm && <p>Height: {profile.heightCm} cm</p>}
            {profile.weightKg && <p>Weight: {profile.weightKg} kg</p>}
            {profile.bodyFatPercent && (
              <p>Body Fat: {profile.bodyFatPercent}%</p>
            )}
          </CardContent>
        </Card>

        {/* Activity & Lifestyle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Lifestyle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {profile.activityLevel && (
              <p>
                Activity:{" "}
                {profile.activityLevel.toLowerCase().replace(/_/g, " ")}
              </p>
            )}
            {profile.sleepHours && <p>Sleep: {profile.sleepHours} hrs/night</p>}
            {profile.dietType && <p>Diet: {profile.dietType}</p>}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {profile.goals.map((goal) => (
                <Badge key={goal} variant="secondary" className="text-xs">
                  {formatGoal(goal)}
                </Badge>
              ))}
              {profile.goals.length === 0 && (
                <p className="text-sm text-muted-foreground">No goals set</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Labs */}
      {labs && labs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Recent Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {labs.map((lab) => (
                <div key={lab.id} className="text-sm">
                  <p className="font-medium">
                    {lab.marker.replace(/_/g, " ")}
                  </p>
                  <p className="text-muted-foreground">
                    {lab.value} {lab.unit}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
