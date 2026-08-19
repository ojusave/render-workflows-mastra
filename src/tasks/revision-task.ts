import { task } from '@renderinc/sdk/workflows'
import { mastra } from '../mastra/index.js'

type Review = {
  focus: string
  feedback: string
}

export const reviseDraft = task(
  {
    name: 'revise_draft',
    plan: 'standard',
    timeoutSeconds: 600,
    retry: {
      maxRetries: 2,
      waitDurationMs: 1_000,
      backoffScaling: 2,
    },
  },
  async function reviseDraft(draft: string, reviews: Review[]): Promise<{ draft: string }> {
    const editor = mastra.getAgentById('editor-agent')
    const response = await editor.generate(`
      Revise the draft using the review feedback.
      Draft: ${draft}
      Reviews: ${JSON.stringify(reviews, null, 2)}
    `)
    if (!response.text) {
      throw new Error('The editor returned no text')
    }
    return {
      draft: response.text,
    }
  },
)
