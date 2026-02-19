import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlaskConical, Github } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <FlaskConical className="h-8 w-8" />
          </div>
          <CardTitle>Sign in to CompoundAtlas</CardTitle>
          <CardDescription>
            Track cycles and build stacks with your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/compounds" });
            }}
          >
            <Button type="submit" variant="outline" className="w-full gap-2">
              <Github className="h-4 w-4" />
              Continue with GitHub
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Compounds and stacks are public.{" "}
            <Link href="/compounds" className="underline">
              Browse without signing in.
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
