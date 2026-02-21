import Link from "next/link";
import { FlaskConical, Sparkles } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";

const NAV_LINKS = [
  { href: "/compounds", label: "Compounds", authRequired: false },
  { href: "/stacks", label: "Stacks", authRequired: false },
  { href: "/cycles", label: "Cycles", authRequired: true },
  { href: "/research", label: "Research", authRequired: false },
];

export async function Navbar() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-sm tracking-tight shrink-0"
        >
          <FlaskConical className="h-5 w-5" />
          CompoundAtlas
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm">
          {NAV_LINKS.filter((l) => !l.authRequired || isLoggedIn).map(
            (link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
          {isLoggedIn && (
            <Link
              href="/stacks/ai"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Builder
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-1.5 ml-1">
              <Link href="/settings" aria-label="Settings">
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={user.image ?? undefined}
                    alt={user.name ?? "User"}
                  />
                  <AvatarFallback>
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="hidden sm:flex text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" className="ml-1">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          <MobileNav isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </header>
  );
}
