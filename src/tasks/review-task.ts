import { task } from '@renderinc/sdk/workflows'
import { mastra } from '../mastra/index.js'

type Review = {
  focus: string
  feedback: string
}

export const reviewDraft = task(
  {
    name: 'review_draft',
    plan: 'starter',
    timeoutSeconds: 300,
    retry: {
      maxRetries: 2,
      waitDurationMs: 1_000,
      backoffScaling: 2,
    },
  },
  async function reviewDraft(draft: string, focus: string): Promise<Review> {
    const reviewer = mastra.getAgentById('reviewer-agent')
    const response = await reviewer.generate(`
      Review this draft for ${focus}.
      Draft: ${draft}
    `)
    if (!response.text) {
      throw new Error(`The ${focus} review returned no text`)
    }
    return {
      focus,
      feedback: response.text,
    }
  },
)
