/**
 * Starts the same child tasks editorial_pipeline would: three review_draft
 * runs in parallel, then revise_draft. Dispatching from the web lets SSE
 * show each task run as it starts and finishes.
 */
import { Render } from "@renderinc/sdk";
import { REVIEW_FOCUSES, type Review } from "../shared/editorial.js";

const WORKFLOW_SLUG =
  process.env.WORKFLOW_SLUG || "render-workflows-mastra-workflow";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "1500", 10);

const render = new Render();

function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function isDone(status: string): boolean {
  return status === "completed" || status === "succeeded";
}

function isFailed(status: string): boolean {
  return status === "failed" || status === "canceled";
}

async function poll(taskRunId: string) {
  const details = await render.workflows.getTaskRun(taskRunId);
  if (isFailed(details.status)) {
    throw new Error(
      `Task ${taskRunId} ${details.status}: ${details.error ?? "unknown error"}`
    );
  }
  return details;
}

function timing(
  details: { startedAt?: string; completedAt?: string },
  fallbackStart: number
) {
  const at = Date.now();
  let durationMs = Math.max(0, at - fallbackStart);
  if (details.startedAt && details.completedAt) {
    const parsed =
      Date.parse(details.completedAt) - Date.parse(details.startedAt);
    if (Number.isFinite(parsed) && parsed >= 0) durationMs = parsed;
  }
  return {
    at,
    startedAt: details.startedAt,
    completedAt: details.completedAt,
    durationMs,
  };
}

export async function* runEditorialPipeline(
  draft: string
): AsyncGenerator<string> {
  const startedAt = Date.now();
  yield sse("plan", {
    focuses: [...REVIEW_FOCUSES],
    startedAt,
  });

  const reviewRuns: Array<{
    focus: string;
    taskRunId: string;
    startedMs: number;
  }> = [];
  for (const focus of REVIEW_FOCUSES) {
    const started = await render.workflows.startTask(
      `${WORKFLOW_SLUG}/review_draft`,
      [draft, focus]
    );
    const startedMs = Date.now();
    reviewRuns.push({ focus, taskRunId: started.taskRunId, startedMs });
    yield sse("stage", {
      rowId: focus,
      task: "review_draft",
      status: "running",
      taskRunId: started.taskRunId,
      at: startedMs,
    });
  }

  yield sse("status", {
    phase: "reviewing",
    total: reviewRuns.length,
    done: 0,
  });

  const pending = new Map(reviewRuns.map((run) => [run.taskRunId, run]));
  const reviews: Review[] = [];

  while (pending.size > 0) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    for (const [id, info] of [...pending]) {
      const details = await poll(id);
      yield sse("heartbeat", {
        rowId: info.focus,
        task: "review_draft",
        status: details.status,
        remaining: pending.size,
        done: reviews.length,
        total: reviewRuns.length,
      });
      if (!isDone(details.status)) continue;
      pending.delete(id);
      const review = (details.results?.[0] ?? {
        focus: info.focus,
        feedback: "",
      }) as Review;
      reviews.push(review);
      yield sse("stage", {
        rowId: info.focus,
        task: "review_draft",
        status: "complete",
        taskRunId: id,
        review,
        done: reviews.length,
        total: reviewRuns.length,
        ...timing(details, info.startedMs),
      });
    }
  }

  yield sse("status", { phase: "revising" });
  const reviseStarted = await render.workflows.startTask(
    `${WORKFLOW_SLUG}/revise_draft`,
    [draft, reviews]
  );
  const reviseStartedMs = Date.now();
  yield sse("stage", {
    rowId: "revise",
    task: "revise_draft",
    status: "running",
    taskRunId: reviseStarted.taskRunId,
    at: reviseStartedMs,
  });

  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const details = await poll(reviseStarted.taskRunId);
    yield sse("heartbeat", {
      rowId: "revise",
      task: "revise_draft",
      status: details.status,
    });
    if (!isDone(details.status)) continue;
    const revised = (details.results?.[0] ?? { draft: "" }) as { draft: string };
    yield sse("stage", {
      rowId: "revise",
      task: "revise_draft",
      status: "complete",
      taskRunId: reviseStarted.taskRunId,
      ...timing(details, reviseStartedMs),
    });
    yield sse("done", {
      draft: revised.draft ?? "",
      reviews,
      durationMs: Date.now() - startedAt,
      taskRunId: reviseStarted.taskRunId,
    });
    return;
  }
}
