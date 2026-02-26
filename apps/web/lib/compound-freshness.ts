const DEFAULT_STALE_DAYS = 180;

export function getStaleThresholdDays(): number {
  const raw = process.env.COMPOUND_STALE_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_STALE_DAYS;
  return parsed;
}

export function isCompoundStale(lastResearchSync: Date | string | null | undefined): boolean {
  if (!lastResearchSync) return true;

  const thresholdDays = getStaleThresholdDays();
  const syncedAt = new Date(lastResearchSync);
  if (Number.isNaN(syncedAt.getTime())) return true;

  const ageMs = Date.now() - syncedAt.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}
