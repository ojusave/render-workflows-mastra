import type { Response } from "express";
import { runEditorialPipeline } from "./pipeline/orchestrator.js";

function sseHeaders(res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(":ok\n\n");
}

/** Stream editorial pipeline progress to the browser. */
export async function streamEditorialPipeline(
  res: Response,
  draft: string
): Promise<void> {
  sseHeaders(res);
  try {
    for await (const event of runEditorialPipeline(draft)) {
      res.write(event);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  }
  res.end();
}
