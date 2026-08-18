/**
 * Dispatches editorial_pipeline and yields SSE events while it runs.
 * Fan-out lives inside the workflow parent, not on this web process.
 */
import { Render } from "@renderinc/sdk";
import { REVIEW_FOCUSES } from "../shared/editorial.js";

const WORKFLOW_SLUG =
  process.env.WORKFLOW_SLUG || "render-workflows-mastra-workflow";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "3000", 10);

const render = new Render();

function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function* runEditorialPipeline(
  draft: string
): AsyncGenerator<string> {
  yield sse("status", { phase: "starting" });

  const started = await render.workflows.startTask(
    `${WORKFLOW_SLUG}/editorial_pipeline`,
    [draft]
  );

  yield sse("status", {
    phase: "reviewing",
    taskRunId: started.taskRunId,
    focuses: [...REVIEW_FOCUSES],
  });

  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const details = await render.workflows.getTaskRun(started.taskRunId);
    const status = details.status;

    if (status === "completed" || status === "succeeded") {
      const result = (details.results?.[0] ?? null) as {
        draft?: string;
        reviews?: Array<{ focus: string; feedback: string }>;
      } | null;
      yield sse("done", {
        draft: result?.draft ?? "",
        reviews: result?.reviews ?? [],
        taskRunId: started.taskRunId,
      });
      return;
    }

    if (status === "failed" || status === "canceled") {
      const error = details.error ?? "unknown error";
      throw new Error(`Task editorial_pipeline ${status}: ${error}`);
    }

    yield sse("heartbeat", { status, taskRunId: started.taskRunId });
  }
}
