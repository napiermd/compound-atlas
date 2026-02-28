export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";
export type RiskBand = "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";

export const SIGNAL_VOCAB = {
  trend: {
    high: "Trend: High",
    rising: "Trend: Rising",
  },
  confidence: {
    high: "Confidence: High",
    medium: "Confidence: Medium",
    low: "Confidence: Low",
  },
  stale: "Stale data",
  risk: {
    low: "Risk: Low",
    moderate: "Risk: Moderate",
    high: "Risk: High",
    unknown: "Risk: Unknown",
  },
} as const;

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function riskBand(score: number | null): RiskBand {
  if (score == null) return "UNKNOWN";
  if (score >= 70) return "LOW";
  if (score >= 45) return "MODERATE";
  return "HIGH";
}

export function riskLabelFromScore(score: number | null): string {
  const band = riskBand(score);
  if (band === "LOW") return SIGNAL_VOCAB.risk.low;
  if (band === "MODERATE") return SIGNAL_VOCAB.risk.moderate;
  if (band === "HIGH") return SIGNAL_VOCAB.risk.high;
  return SIGNAL_VOCAB.risk.unknown;
}

export function confidenceLabelFromScore(score: number): string {
  const band = confidenceBand(score);
  if (band === "HIGH") return SIGNAL_VOCAB.confidence.high;
  if (band === "MEDIUM") return SIGNAL_VOCAB.confidence.medium;
  return SIGNAL_VOCAB.confidence.low;
}
