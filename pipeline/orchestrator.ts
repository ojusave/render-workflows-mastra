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

type TaskSnapshot = {
  id: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  results?: unknown[];
  attempts?: Array<{ startedAt?: string; completedAt?: string }>;
};

function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function isDone(status: string): boolean {
  return status === "completed" || status === "succeeded";
}

function isFailed(status: string): boolean {
  return status === "failed" || status === "canceled";
}

/** startedAt / completedAt from the Workflows task run, not the web clock. */
function workflowTimes(details: TaskSnapshot) {
  const first = details.attempts?.[0];
  const last = details.attempts?.[details.attempts.length - 1];
  return {
    startedAt: details.startedAt ?? first?.startedAt ?? null,
    completedAt: details.completedAt ?? last?.completedAt ?? null,
  };
}

function rowPayload(
  rowId: string,
  task: string,
  details: TaskSnapshot,
  extra: Record<string, unknown> = {}
) {
  return {
    rowId,
    task,
    taskRunId: details.id,
    status: details.status,
    ...workflowTimes(details),
    ...extra,
  };
}

async function poll(taskRunId: string): Promise<TaskSnapshot> {
  const details = await render.workflows.getTaskRun(taskRunId);
  if (isFailed(details.status)) {
    throw new Error(
      `Task ${taskRunId} ${details.status}: ${details.error ?? "unknown error"}`
    );
  }
  return details;
}

export async function* runEditorialPipeline(
  draft: string
): AsyncGenerator<string> {
  yield sse("plan", { focuses: [...REVIEW_FOCUSES] });

  const reviewRuns = await Promise.all(
    REVIEW_FOCUSES.map(async (focus) => {
      const started = await render.workflows.startTask(
        `${WORKFLOW_SLUG}/review_draft`,
        [draft, focus]
      );
      return { focus, taskRunId: started.taskRunId };
    })
  );

  for (const run of reviewRuns) {
    yield sse("stage", {
      rowId: run.focus,
      task: "review_draft",
      status: "running",
      taskRunId: run.taskRunId,
    });
  }

  const firstLooks = await Promise.all(
    reviewRuns.map((run) => poll(run.taskRunId))
  );
  for (let i = 0; i < reviewRuns.length; i++) {
    yield sse("heartbeat", rowPayload(reviewRuns[i].focus, "review_draft", firstLooks[i]));
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
    const snapshots = await Promise.all(
      [...pending].map(async ([id, info]) => ({
        info,
        details: await poll(id),
      }))
    );
    for (const { info, details } of snapshots) {
      yield sse(
        "heartbeat",
        rowPayload(info.focus, "review_draft", details, {
          remaining: pending.size,
          done: reviews.length,
          total: reviewRuns.length,
        })
      );
      if (!isDone(details.status)) continue;
      pending.delete(info.taskRunId);
      const review = (details.results?.[0] ?? {
        focus: info.focus,
        feedback: "",
      }) as Review;
      reviews.push(review);
      yield sse(
        "stage",
        rowPayload(info.focus, "review_draft", details, {
          status: "complete",
          review,
          done: reviews.length,
          total: reviewRuns.length,
        })
      );
    }
  }

  yield sse("status", { phase: "revising" });
  const reviseStarted = await render.workflows.startTask(
    `${WORKFLOW_SLUG}/revise_draft`,
    [draft, reviews]
  );
  yield sse("stage", {
    rowId: "revise",
    task: "revise_draft",
    status: "running",
    taskRunId: reviseStarted.taskRunId,
  });

  let revise = await poll(reviseStarted.taskRunId);
  yield sse("heartbeat", rowPayload("revise", "revise_draft", revise));

  while (!isDone(revise.status)) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    revise = await poll(reviseStarted.taskRunId);
    yield sse("heartbeat", rowPayload("revise", "revise_draft", revise));
  }

  const revised = (revise.results?.[0] ?? { draft: "" }) as { draft: string };
  yield sse(
    "stage",
    rowPayload("revise", "revise_draft", revise, { status: "complete" })
  );
  yield sse("done", {
    draft: revised.draft ?? "",
    reviews,
    ...workflowTimes(revise),
    taskRunId: revise.id,
  });
}
