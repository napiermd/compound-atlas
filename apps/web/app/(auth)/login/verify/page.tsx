import { FlaskConical, Mail } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email — CompoundAtlas" };

export default function VerifyPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a sign-in link to your inbox. Click it to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            The link expires in 24 hours. If you don&apos;t see it, check your
            spam folder.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Try a different email</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/compounds">
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                Browse without signing in
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
