import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export async function Nav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FlaskConical className="h-5 w-5" />
          CompoundAtlas
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/compounds"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Compounds
          </Link>
          <Link
            href="/stacks"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Stacks
          </Link>
          <Link
            href="/cycles"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Cycles
          </Link>
          <Link
            href="/research"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Research
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
