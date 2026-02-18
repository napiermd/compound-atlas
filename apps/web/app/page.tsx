import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, BookOpen, Layers, Activity } from "lucide-react";
import { db } from "@/lib/db";

export default async function HomePage() {
  const [compoundCount, studyCount] = await Promise.all([
    db.compound.count(),
    db.study.count(),
  ]);

  const features = [
    {
      icon: FlaskConical,
      title: "Compound Database",
      desc: "Evidence scores computed from PubMed and Semantic Scholar",
      href: "/compounds",
    },
    {
      icon: BookOpen,
      title: "Research Explorer",
      desc: "Browse studies with full citations, effect sizes, and evidence grades",
      href: "/research",
    },
    {
      icon: Layers,
      title: "Stack Builder",
      desc: "Create, share, and fork evidence-backed compound protocols",
      href: "/stacks",
    },
    {
      icon: Activity,
      title: "Cycle Tracker",
      desc: "Log daily metrics, mood, bloodwork, and subjective markers",
      href: "/cycles",
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <Badge variant="outline" className="mb-4">
          Open Source
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 max-w-3xl">
          Evidence-Based Compound Research
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-8">
          Browse peer-reviewed data on supplements, nootropics, and performance
          compounds. Build stacks. Track cycles. Know what works.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/compounds">Browse Compounds</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/stacks">Explore Stacks</Link>
          </Button>
        </div>

        {(compoundCount > 0 || studyCount > 0) && (
          <div className="flex gap-8 mt-12 text-sm text-muted-foreground">
            {compoundCount > 0 && (
              <div>
                <span className="text-2xl font-bold text-foreground block">
                  {compoundCount}
                </span>
                compounds
              </div>
            )}
            {studyCount > 0 && (
              <div>
                <span className="text-2xl font-bold text-foreground block">
                  {studyCount}
                </span>
                studies
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-8 pb-24 max-w-6xl mx-auto w-full">
        {features.map(({ icon: Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-lg border p-6 hover:bg-accent transition-colors"
          >
            <Icon className="h-8 w-8 mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
