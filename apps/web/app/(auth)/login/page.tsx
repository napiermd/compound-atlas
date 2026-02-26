import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlaskConical, Github, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in — CompoundAtlas" };

export default function LoginPage() {
  const emailEnabled = Boolean(process.env.AUTH_RESEND_KEY);
  const githubEnabled = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);

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
        <CardContent className="flex flex-col gap-4">
          {/* Email magic link */}
          {emailEnabled && (
            <form
              action={async (formData: FormData) => {
                "use server";
                await signIn("resend", formData);
              }}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="redirectTo" value="/compounds" />
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full"
              />
              <Button type="submit" className="w-full gap-2">
                <Mail className="h-4 w-4" />
                Continue with Email
              </Button>
            </form>
          )}

          {emailEnabled && githubEnabled && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
          )}

          {/* GitHub OAuth */}
          {githubEnabled && (
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
          )}

          {!emailEnabled && !githubEnabled && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Login providers are temporarily unavailable. You can still browse compounds and stacks without signing in.
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
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
