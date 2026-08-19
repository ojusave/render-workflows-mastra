import { task } from '@renderinc/sdk/workflows'
import { reviewDraft } from './review-task.js'
import { reviseDraft } from './revision-task.js'

export const editorialPipeline = task(
  {
    name: 'editorial_pipeline',
    plan: 'starter',
    timeoutSeconds: 1_200,
    retry: {
      maxRetries: 0,
      waitDurationMs: 1_000,
      backoffScaling: 2,
    },
  },
  async function editorialPipeline(draft: string): Promise<{ draft: string }> {
    const focuses = ['technical clarity', 'structure and flow', 'reader usefulness']
    const reviews = await Promise.all(focuses.map(focus => reviewDraft(draft, focus)))
    return reviseDraft(draft, reviews)
  },
)
