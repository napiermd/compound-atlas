"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, FlaskConical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/compounds", label: "Compounds", authRequired: false },
  { href: "/stacks", label: "Stacks", authRequired: false },
  { href: "/cycles", label: "Cycles", authRequired: true },
  { href: "/research", label: "Research", authRequired: false },
];

interface Props {
  isLoggedIn: boolean;
}

export function MobileNav({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 pt-8">
          <SheetHeader className="mb-6 text-left">
            <SheetTitle asChild>
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-base"
                onClick={() => setOpen(false)}
              >
                <FlaskConical className="h-4 w-4" />
                CompoundAtlas
              </Link>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5">
            {NAV_LINKS.filter((l) => !l.authRequired || isLoggedIn).map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
            {isLoggedIn && (
              <Link
                href="/stacks/ai"
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                onClick={() => setOpen(false)}
              >
                <Sparkles className="h-4 w-4" />
                AI Stack Builder
              </Link>
            )}
            {isLoggedIn && (
              <Link
                href="/settings"
                className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
