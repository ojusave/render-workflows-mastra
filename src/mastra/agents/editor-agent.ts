import { Agent } from '@mastra/core/agent'

export const editorAgent = new Agent({
  id: 'editor-agent',
  name: 'Editor Agent',
  model: 'openai/gpt-5.6-sol',
  instructions: `
    Revise the supplied draft using the reviewers' feedback.
    Return the complete revised draft and nothing else.
    Preserve accurate details and do not introduce unsupported claims.
  `,
})
