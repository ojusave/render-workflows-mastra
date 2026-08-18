export const REVIEW_FOCUSES = [
  "technical clarity",
  "structure and flow",
  "reader usefulness",
] as const;

export type ReviewFocus = (typeof REVIEW_FOCUSES)[number];

export type Review = {
  focus: string;
  verdict: string;
  notes: string[];
  feedback: string;
};

export type EditorialResult = {
  draft: string;
  reviews: Review[];
};

/** Parse a reviewer reply into a one-line verdict plus up to three notes. */
export function parseReview(focus: string, text: string): Review {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  try {
    const parsed = JSON.parse(raw) as { verdict?: unknown; notes?: unknown };
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.map((n) => String(n).trim()).filter(Boolean).slice(0, 3)
      : [];
    const verdict = String(parsed.verdict ?? "").trim();
    if (verdict) {
      return { focus, verdict, notes, feedback: text };
    }
  } catch {
    // fall through to first-line fallback
  }
  const first = text.split("\n").find((line) => line.trim()) ?? "";
  return {
    focus,
    verdict: first.replace(/^[#>*\-\d.\s]+/, "").slice(0, 160),
    notes: [],
    feedback: text,
  };
}
