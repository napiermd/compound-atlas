import { ArrowRight } from "lucide-react";

const VELIX_BASE = "https://velix.health";

function velixUrl(variant: string, compound?: string) {
  const params = new URLSearchParams({
    ref: "compoundatlas",
    utm_source: "compoundatlas",
    utm_medium: "cta",
    utm_content: variant,
  });
  if (compound) params.set("compound", compound);
  return `${VELIX_BASE}?${params.toString()}`;
}

const copy = {
  compound: {
    headline: "Want this prescribed by a board-certified physician?",
    body: "Velix Health physicians review your labs, build evidence-based protocols, and monitor your progress. Every prescription is referenced.",
    cta: "Apply for Membership",
  },
  stack: {
    headline: "Want a physician-built version of this protocol?",
    body: "Velix Health builds personalized protocols based on your labs, not templates. Board-certified physicians. Evidence-first.",
    cta: "Get Started with Velix",
  },
  general: {
    headline: "Evidence-based telehealth. Board-certified physicians only.",
    body: "Velix Health is a physician-led telehealth practice for hormone optimization, metabolic health, peptide therapy, and hair loss. Nothing gets prescribed until the research and your labs support it.",
    cta: "Learn More",
  },
} as const;

type Variant = keyof typeof copy;

interface VelixCTAProps {
  variant: Variant;
  compoundSlug?: string;
  className?: string;
}

export function VelixCTA({ variant, compoundSlug, className = "" }: VelixCTAProps) {
  const { headline, body, cta } = copy[variant];
  const href = velixUrl(variant, compoundSlug);

  return (
    <div className={`rounded-lg border border-[#4FFFB0]/20 bg-[#080C10] p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#4FFFB0]">
              Velix Health
            </span>
          </div>
          <p className="text-sm font-semibold text-white mb-1.5">{headline}</p>
          <p className="text-xs text-[#8B95A5] leading-relaxed mb-4">{body}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#080C10] bg-[#4FFFB0] px-4 py-2 hover:bg-white transition-colors"
          >
            {cta}
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function VelixBanner({ className = "" }: { className?: string }) {
  return (
    <a
      href={velixUrl("banner")}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between gap-4 rounded-lg border border-[#4FFFB0]/15 bg-[#080C10] px-4 py-3 hover:border-[#4FFFB0]/30 transition-colors group ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#4FFFB0]">
          Velix Health
        </span>
        <span className="text-xs text-[#8B95A5]">
          Physician-guided protocols based on your labs
        </span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-[#4FFFB0] group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}
