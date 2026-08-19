/**
 * Express API around the Mastra + Render Workflows editorial pipeline.
 */
import cors from "cors";
import express, { type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { streamEditorialPipeline } from "./pipeline/stream.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.post("/review", (req: Request, res: Response) => {
  const draft = typeof req.body?.draft === "string" ? req.body.draft.trim() : "";
  if (!draft) {
    res.status(400).json({ error: "draft is required" });
    return;
  }
  void streamEditorialPipeline(res, draft);
});

app.use(express.static(path.join(__dirname, "static"), { maxAge: 0, etag: false }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on 0.0.0.0:${PORT}`);
});
