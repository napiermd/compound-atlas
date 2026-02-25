import Link from "next/link";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/compounds", label: "Compounds" },
  { href: "/stacks", label: "Stacks" },
  { href: "/cycles", label: "Cycles" },
  { href: "/research", label: "Research" },
] as const;

interface Props {
  current: (typeof SECTIONS)[number]["href"];
}

export function SectionNav({ current }: Props) {
  return (
    <nav aria-label="Section navigation" className="mb-6">
      <div className="inline-flex rounded-lg border bg-muted/30 p-1 gap-1 flex-wrap">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              current === section.href
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/70"
            )}
          >
            {section.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
