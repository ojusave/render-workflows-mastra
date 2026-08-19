import { Mastra } from '@mastra/core/mastra'
import { editorAgent } from './agents/editor-agent.js'
import { reviewerAgent } from './agents/reviewer-agent.js'

export const mastra = new Mastra({
  agents: {
    editorAgent,
    reviewerAgent,
  },
})
