/**
 * Mastra agents used by Render Workflow tasks.
 * Model routing reads MASTRA_MODEL (provider/model-name) plus the matching
 * provider key (OPENAI_API_KEY, ANTHROPIC_API_KEY, ...).
 */
import { Agent } from "@mastra/core/agent";

const model = process.env.MASTRA_MODEL;

if (!model) {
  throw new Error("MASTRA_MODEL is required");
}

export const reviewerAgent = new Agent({
  id: "reviewer-agent",
  name: "Reviewer Agent",
  model,
  instructions: `
You review a draft from ONE requested perspective only.
Do not rewrite the draft.
Reply with JSON only, no markdown fences:
{"verdict":"one sentence naming the main problem","notes":["specific edit","specific edit","specific edit"]}
Keep each note under 12 words. At most 3 notes.
`,
});

export const editorAgent = new Agent({
  id: "editor-agent",
  name: "Editor Agent",
  model,
  instructions: `
Revise the supplied draft using the reviewers' verdicts and notes.
Return the complete revised draft and nothing else.
Preserve accurate details and do not introduce unsupported claims.
`,
});
