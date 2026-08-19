import { Agent } from '@mastra/core/agent'

export const reviewerAgent = new Agent({
  id: 'reviewer-agent',
  name: 'Reviewer Agent',
  model: 'openai/gpt-5.6-sol',
  instructions: `
    Review the supplied draft only from the requested perspective.
    Identify concrete problems and recommend specific changes.
    Do not rewrite the full draft.
  `,
})
