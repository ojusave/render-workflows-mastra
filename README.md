<div align="center">

# Mastra Editorial Pipeline

A distributed editorial pipeline combining **Render Workflows** for orchestration and **Mastra** agents for review and revision. The UI starts `editorial_pipeline`. That parent fans out three `review_draft` runs, then `revise_draft`.

<p>
  <a href="https://render.com" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/Render-Workflows-6c63ff?logo=render&logoColor=white" alt="Render Workflows" />
  </a>
  <a href="https://mastra.ai" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/Mastra-Agents-ff6b6b?logoColor=white" alt="Mastra" />
  </a>
  <a href="https://discord.gg/gvC7ceS9YS" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/Discord-Render%20Developers-5865F2?logo=discord&logoColor=white" alt="Discord" />
  </a>
</p>

</div>

## What This Demo Shows

This repo demonstrates how to split a Mastra agent pipeline across Render Workflows tasks:

| Platform | Role |
| --- | --- |
| **<a href="https://render.com/docs/workflows?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra" target="_blank" rel="noopener noreferrer">Render Workflows</a>** | Queues each task on its own instance, with retries, timeouts, and parallel fan-out |
| **<a href="https://mastra.ai" target="_blank" rel="noopener noreferrer">Mastra</a>** | Reviewer and editor agents (`openai/gpt-5.6-sol` in the <a href="https://mastra.ai/integrations/deploy/render" target="_blank" rel="noopener noreferrer">Mastra Render guide</a>) |
| **<a href="https://render.com/docs/web-services?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra" target="_blank" rel="noopener noreferrer">Render Web Services</a>** | Express API plus a live UI that streams progress over SSE |

## How It Works

1. **Browser** posts a draft to the **Express API** on Render
2. **Express** starts `editorial_pipeline` and streams each chained child run over SSE
3. The parent runs three `review_draft` tasks in parallel, then `revise_draft`

| Render Workflow Task | Mastra agent | What it does |
| --- | --- | --- |
| `editorial_pipeline` | — | Parent: `Promise.all` on three reviews, then revise |
| `review_draft` | Reviewer | One task run per focus: technical clarity, structure and flow, reader usefulness |
| `revise_draft` | Editor | Rewrites the draft from the combined reviews |

The live UI starts the same parent the <a href="https://mastra.ai/integrations/deploy/render" target="_blank" rel="noopener noreferrer">Mastra Render guide</a> starts. Bars and cards are those child task runs.

4. Open the live page, click **Run pipeline**, and watch the timeline before the rewrite appears.

## Quick Start

### Prerequisites

- <a href="https://dashboard.render.com/register?utm_source=github&utm_medium=referral&utm_campaign=ojus_demos&utm_content=readme_link" target="_blank" rel="noopener noreferrer">Render account</a>
- An API key from a <a href="https://mastra.ai/models" target="_blank" rel="noopener noreferrer">Mastra model provider</a> (OpenAI, Anthropic, Google, and others)

### Deploy

Blueprints cannot create Workflow services yet, so this demo is set up in the dashboard.

1. Create the Workflow service:
   - Go to <a href="https://dashboard.render.com" target="_blank" rel="noopener noreferrer">Render Dashboard</a> → **New** → **Workflow**
   - Connect this repository
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:workflows`
   - Name: `render-workflows-mastra-workflow`
   - Add env var: `OPENAI_API_KEY`

2. Create the web service from `render.yaml`, or **New** → **Web Service** on the same repo:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Add env vars: `RENDER_API_KEY` (<a href="https://render.com/docs/api?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra#1-create-an-api-key" target="_blank" rel="noopener noreferrer">create one</a>) and `WORKFLOW_SLUG=render-workflows-mastra-workflow`

3. Open the web service URL, load the sample draft, and click **Run pipeline**

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
| `RENDER_API_KEY` | Web service | <a href="https://render.com/docs/api?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra#1-create-an-api-key" target="_blank" rel="noopener noreferrer">Render API key</a> for dispatching tasks |
| `WORKFLOW_SLUG` | Web service | Must match the Workflow slug (`render-workflows-mastra-workflow` by default) |
| `OPENAI_API_KEY` | Workflow service | Required by the agents on <a href="https://mastra.ai/integrations/deploy/render" target="_blank" rel="noopener noreferrer">the Mastra guide</a> (`openai/gpt-5.6-sol`) |
| `POLL_INTERVAL_MS` | Web service | How often Express polls the parent task (default 800) |

## Project Structure

```
src/                         Same files as the Mastra Render guide
  index.ts
  mastra/
  tasks/
web/                         Live UI around those tasks
  server.ts
  pipeline/
  static/index.html
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
| Empty model output | The task throws and retries; check the model name against <a href="https://mastra.ai/models" target="_blank" rel="noopener noreferrer">Mastra's router</a> |
| Web service cannot dispatch | Set `RENDER_API_KEY` on the web service |

## Learn More

**Render:**
- <a href="https://render.com/docs/workflows?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra" target="_blank" rel="noopener noreferrer">Render Workflows Documentation</a>
- <a href="https://render.com/docs/workflows-defining?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra" target="_blank" rel="noopener noreferrer">Defining tasks</a>
- <a href="https://discord.gg/gvC7ceS9YS" target="_blank" rel="noopener noreferrer">Render Developers Discord</a>

**Mastra:**
- <a href="https://mastra.ai/integrations/deploy/render" target="_blank" rel="noopener noreferrer">Mastra on Render</a>
- <a href="https://mastra.ai/docs/agents/overview" target="_blank" rel="noopener noreferrer">Mastra agents</a>
- <a href="https://mastra.ai/models" target="_blank" rel="noopener noreferrer">Model router</a>

## License

[MIT](LICENSE)
