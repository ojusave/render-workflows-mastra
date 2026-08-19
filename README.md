<div align="center">

# Mastra Editorial Pipeline

A distributed editorial pipeline combining **Render Workflows** for orchestration and **Mastra** agents for review and revision. The UI starts `editorial_pipeline`. That parent fans out three `review_draft` runs, then `revise_draft`.

<p>
  <a href="https://render.com/deploy?repo=https://github.com/ojusave/render-workflows-mastra">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
  </a>
</p>

<p>
  <a href="https://render.com">
    <img src="https://img.shields.io/badge/Render-Workflows-6c63ff?logo=render&logoColor=white" alt="Render Workflows" />
  </a>
  <a href="https://mastra.ai">
    <img src="https://img.shields.io/badge/Mastra-Agents-ff6b6b?logoColor=white" alt="Mastra" />
  </a>
  <a href="https://discord.gg/gvC7ceS9YS">
    <img src="https://img.shields.io/badge/Discord-Render%20Developers-5865F2?logo=discord&logoColor=white" alt="Discord" />
  </a>
</p>

</div>

## What This Demo Shows

This repo demonstrates how to split a Mastra agent pipeline across Render Workflows tasks:

| Platform | Role |
| --- | --- |
| **[Render Workflows](https://render.com/docs/workflows?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra)** | Queues each task on its own instance, with retries, timeouts, and parallel fan-out |
| **[Mastra](https://mastra.ai)** | Reviewer and editor agents (`openai/gpt-5.6-sol` in the [Mastra Render guide](https://mastra.ai/integrations/deploy/render)) |
| **[Render Web Services](https://render.com/docs/web-services?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra)** | Express API plus a live UI that streams progress over SSE |

## How It Works

1. **Browser** posts a draft to the **Express API** on Render
2. **Express** starts `editorial_pipeline` and streams each chained child run over SSE
3. The parent runs three `review_draft` tasks in parallel, then `revise_draft`

| Render Workflow Task | Mastra agent | What it does |
| --- | --- | --- |
| `editorial_pipeline` | — | Parent: `Promise.all` on three reviews, then revise |
| `review_draft` | Reviewer | One task run per focus: technical clarity, structure and flow, reader usefulness |
| `revise_draft` | Editor | Rewrites the draft from the combined reviews |

The live UI starts the same parent the [Mastra Render guide](https://mastra.ai/integrations/deploy/render) starts. Bars and cards are those child task runs.

4. Open the live page, click **Run pipeline**, and watch the timeline before the rewrite appears.

## Quick Start

### Prerequisites

- [Render account](https://dashboard.render.com/register?utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_link)
- An API key from a [Mastra model provider](https://mastra.ai/models) (OpenAI, Anthropic, Google, and others)

### Deploy

1. Click **Deploy to Render** above
2. You will be prompted for:
   - `RENDER_API_KEY` — [create one here](https://render.com/docs/api?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra#1-create-an-api-key)

3. Create the Workflow service (Blueprints do not define Workflows yet):
   - Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Workflow**
   - Connect this repository
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:workflows`
   - Name: `render-workflows-mastra-workflow`
   - Add env var: `OPENAI_API_KEY`

4. Open the web service URL, load the sample draft, and click **Run pipeline**

The Render CLI can create the same Workflow service:

```bash
./scripts/create-workflow-on-render.sh
```

## Features

| Feature | Description |
| --- | --- |
| **Parallel reviews** | Three `review_draft` runs start together via `Promise.all` inside `editorial_pipeline` |
| **Independent retries** | A flaky model call retries that review without restarting the others |
| **Per-task compute** | Reviewers use `starter`; the editor uses `standard` with a longer timeout |
| **Live progress** | The UI streams SSE events while the parent task runs |

## Configuration

| Variable | Where | Description |
| --- | --- | --- |
| `RENDER_API_KEY` | Web service | [Render API key](https://render.com/docs/api?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra#1-create-an-api-key) for dispatching tasks |
| `WORKFLOW_SLUG` | Web service | Must match the Workflow slug (`render-workflows-mastra-workflow` by default) |
| `OPENAI_API_KEY` | Workflow service | Required by the agents on [the Mastra guide](https://mastra.ai/integrations/deploy/render) (`openai/gpt-5.6-sol`) |
| `POLL_INTERVAL_MS` | Web service | How often Express polls the parent task (default 800) |

## Project Structure

```
src/index.ts                 Workflow service entry (registers tasks)
src/mastra/
  index.ts                   Mastra instance
  agents/reviewer-agent.ts   Reviewer agent
  agents/editor-agent.ts     Editor agent
src/tasks/
  review-task.ts             review_draft
  revision-task.ts           revise_draft
  editorial-task.ts          editorial_pipeline
src/server.ts                Express API + SSE
src/pipeline/orchestrator.ts Starts editorial_pipeline and polls child runs
static/index.html            Live UI
render.yaml                  Web service Blueprint
```

## API Routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Editorial UI |
| `GET` | `/health` | Health check |
| `POST` | `/review` | `{ "draft": "..." }` → SSE stream (`status`, `done`, `error`) |

## Troubleshooting

| Problem | Solution |
| --- | --- |
| Tasks fail immediately | Set `OPENAI_API_KEY` on the **workflow** service, not only the web service |
| `startTask` returns but nothing runs | `WORKFLOW_SLUG` must match the Workflow slug in Dashboard → Workflow → General |
| Empty model output | The task throws and retries; check the model name against [Mastra's router](https://mastra.ai/models) |
| Web service cannot dispatch | Set `RENDER_API_KEY` on the web service |

## Learn More

**Render:**
- [Render Workflows Documentation](https://render.com/docs/workflows?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra)
- [Defining tasks](https://render.com/docs/workflows-defining?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra)
- [Render Developers Discord](https://discord.gg/gvC7ceS9YS)

**Mastra:**
- [Mastra on Render](https://mastra.ai/integrations/deploy/render)
- [Mastra agents](https://mastra.ai/docs/agents/overview)
- [Model router](https://mastra.ai/models)

## License

[MIT](LICENSE)
