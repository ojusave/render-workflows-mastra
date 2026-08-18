import { task } from "@renderinc/sdk/workflows";
import { mastra } from "../mastra/index.js";
import {
  REVIEW_FOCUSES,
  parseReview,
  type EditorialResult,
  type Review,
} from "../shared/editorial.js";

const REVIEW_RETRY = {
  maxRetries: 2,
  waitDurationMs: 1_000,
  backoffScaling: 2,
} as const;

/** One reviewer pass from a single perspective. */
export const reviewDraft = task(
  {
    name: "review_draft",
    plan: "starter",
    timeoutSeconds: 300,
    retry: REVIEW_RETRY,
  },
  async function reviewDraft(draft: string, focus: string): Promise<Review> {
    const reviewer = mastra.getAgentById("reviewer-agent");
    const response = await reviewer.generate(`
Review this draft for ${focus}. JSON only.

Draft:
${draft}
`);

    if (!response.text) {
      throw new Error(`The ${focus} review returned no text`);
    }

    return parseReview(focus, response.text);
  }
);

/** Combine reviews into a revised draft. */
export const reviseDraft = task(
  {
    name: "revise_draft",
    plan: "standard",
    timeoutSeconds: 600,
    retry: REVIEW_RETRY,
  },
  async function reviseDraft(
    draft: string,
    reviews: Review[]
  ): Promise<{ draft: string }> {
    const editor = mastra.getAgentById("editor-agent");
    const compact = reviews.map((r) => ({
      focus: r.focus,
      verdict: r.verdict,
      notes: r.notes,
    }));
    const response = await editor.generate(`
Revise the draft using these reviewer notes.

Draft:
${draft}

Reviews:
${JSON.stringify(compact, null, 2)}
`);

    if (!response.text) {
      throw new Error("The editor returned no text");
    }

    return { draft: response.text };
  }
);

/**
 * Parent task: fan out three reviews, then revise.
 * Calling reviewDraft/reviseDraft here creates chained Render task runs.
 */
export const editorialPipeline = task(
  {
    name: "editorial_pipeline",
    plan: "starter",
    timeoutSeconds: 1_200,
  },
  async function editorialPipeline(draft: string): Promise<EditorialResult> {
    const reviews = await Promise.all(
      REVIEW_FOCUSES.map((focus) => reviewDraft(draft, focus))
    );
    const revised = await reviseDraft(draft, reviews);
    return { draft: revised.draft, reviews };
  }
);
