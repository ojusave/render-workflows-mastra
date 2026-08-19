/**
 * Starts editorial_pipeline (the page's parent task) and streams each
 * chained child run: three review_draft, then revise_draft.
 */
import { Render } from "@renderinc/sdk";
import type { TaskRunDetails } from "@renderinc/sdk/workflows";

const WORKFLOW_SLUG =
  process.env.WORKFLOW_SLUG || "render-workflows-mastra-workflow";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "800", 10);

const FOCUSES = [
  "technical clarity",
  "structure and flow",
  "reader usefulness",
] as const;

const render = new Render();

type Review = { focus: string; feedback: string };

function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function isDone(status: string): boolean {
  return status === "completed" || status === "succeeded";
}

function isFailed(status: string): boolean {
  return status === "failed" || status === "canceled";
}

function times(details: TaskRunDetails) {
  const first = details.attempts?.[0];
  const last = details.attempts?.[details.attempts.length - 1];
  return {
    startedAt: details.startedAt ?? first?.startedAt ?? null,
    completedAt: details.completedAt ?? last?.completedAt ?? null,
  };
}

function rowIdFor(details: TaskRunDetails): string | null {
  const input = details.input;
  if (!Array.isArray(input)) return null;
  if (typeof input[1] === "string" && (FOCUSES as readonly string[]).includes(input[1])) {
    return input[1];
  }
  if (Array.isArray(input[1])) return "revise";
  if (input.length === 1) return "editorial_pipeline";
  return null;
}

async function snapshot(taskRunId: string): Promise<TaskRunDetails> {
  const details = await render.workflows.getTaskRun(taskRunId);
  if (isFailed(details.status)) {
    throw new Error(
      `Task ${taskRunId} ${details.status}: ${details.error ?? "unknown error"}`
    );
  }
  return details;
}

function payload(rowId: string, task: string, details: TaskRunDetails, extra: Record<string, unknown> = {}) {
  const review = details.results?.[0] as Review | undefined;
  return {
    rowId,
    task,
    taskRunId: details.id,
    status: details.status,
    ...times(details),
    ...(review?.focus ? { review } : {}),
    ...extra,
  };
}

export async function* runEditorialPipeline(draft: string): AsyncGenerator<string> {
  const started = await render.workflows.startTask(
    `${WORKFLOW_SLUG}/editorial_pipeline`,
    [draft]
  );
  const parentId = started.taskRunId;
  yield sse("stage", {
    rowId: "editorial_pipeline",
    task: "editorial_pipeline",
    status: "running",
    taskRunId: parentId,
  });

  const seen = new Set<string>();
  const reviews: Review[] = [];

  while (true) {
    const parent = await snapshot(parentId);
    yield sse("heartbeat", payload("editorial_pipeline", "editorial_pipeline", parent));

    const listed = await render.workflows.listTaskRuns({
      rootTaskRunId: [parentId],
      limit: 20,
    });
    for (const item of listed ?? []) {
      const id = item.taskRun.id;
      if (id === parentId) continue;
      const details = await snapshot(id);
      const rowId = rowIdFor(details);
      if (!rowId) continue;
      const task = rowId === "revise" ? "revise_draft" : "review_draft";
      const extra: Record<string, unknown> = {};
      if (rowId !== "revise" && isDone(details.status) && !seen.has(id)) {
        seen.add(id);
        const review = (details.results?.[0] ?? { focus: rowId, feedback: "" }) as Review;
        reviews.push(review);
        extra.review = review;
        extra.status = "complete";
        extra.done = reviews.length;
        extra.total = FOCUSES.length;
        yield sse("stage", payload(rowId, task, details, extra));
      } else {
        yield sse("heartbeat", payload(rowId, task, details, extra));
      }
    }

    if (isDone(parent.status)) {
      const revised = (parent.results?.[0] ?? { draft: "" }) as { draft: string };
      yield sse("stage", payload("editorial_pipeline", "editorial_pipeline", parent, { status: "complete" }));
      yield sse("done", {
        draft: revised.draft ?? "",
        reviews,
        ...times(parent),
        taskRunId: parent.id,
      });
      return;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
