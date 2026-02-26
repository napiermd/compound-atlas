import Link from "next/link";
import { FlaskConical } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <FlaskConical className="h-4 w-4" />
            CompoundAtlas
          </Link>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="https://github.com/napiermd/compound-atlas" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
            <Link href="https://github.com/napiermd/compound-atlas/blob/main/README.md#contributing" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Contributing
            </Link>
            <Link href="https://github.com/napiermd/compound-atlas/tree/main/docs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              API Docs
            </Link>
          </nav>
        </div>

        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>Data sourced from PubMed and Semantic Scholar</p>
          <p>MIT License · Open Source</p>
        </div>
      </div>
    </footer>
  );
}
