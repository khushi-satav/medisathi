export interface DurationParseResult {
  /** Set when the duration parsed to a concrete day count. */
  endDate?: Date;
  /** True only when the source text explicitly says the course has no end
   * (e.g. "ongoing", "chronic") — a real signal, not a guess. */
  isOngoing: boolean;
  /** True when the duration was missing or could not be confidently parsed.
   * The caller must NOT treat this as "ongoing" — it means we don't know,
   * and a human needs to confirm. endDate is left unset in this case. */
  needsConfirmation: boolean;
}

const ONGOING_KEYWORDS = ['ongoing', 'continuous', 'chronic', 'lifelong', 'life long', 'indefinite', 'long term'];

/**
 * Converts an OCR/AI-extracted duration string (e.g. "30 days", "2 weeks",
 * "Ongoing") into an endDate relative to startDate.
 *
 * Unlike gemini.ts's parseDurationDays() (used only for quantity math, which
 * silently falls back to 30 days), this function never silently invents an
 * end date or silently assumes indefinite use. A missing or unparseable
 * duration is surfaced via needsConfirmation so the medication can be
 * flagged for the user to confirm before either an endDate or
 * "ongoing" status is treated as authoritative — the same pattern
 * applies to the escalation-level classification for ambiguous forms.
 */
export function parseDurationToEndDate(startDate: Date, duration?: string | null): DurationParseResult {
  if (!duration || !duration.trim()) {
    return { isOngoing: false, needsConfirmation: true };
  }

  const d = duration.toLowerCase().trim();

  if (ONGOING_KEYWORDS.some((kw) => d.includes(kw))) {
    return { isOngoing: true, needsConfirmation: false };
  }

  const num = parseInt(d.replace(/[^0-9]/g, ''), 10);
  const hasRecognizedUnit = d.includes('day') || d.includes('week') || d.includes('month') || d.includes('year') || /^\d+$/.test(d);

  if (isNaN(num) || num <= 0 || !hasRecognizedUnit) {
    // Has text but we can't confidently turn it into a day count — do not
    // guess a number here the way the quantity calculator does.
    return { isOngoing: false, needsConfirmation: true };
  }

  let days = num;
  if (d.includes('week')) days = num * 7;
  else if (d.includes('month')) days = num * 30;
  else if (d.includes('year')) days = num * 365;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  return { endDate, isOngoing: false, needsConfirmation: false };
}
