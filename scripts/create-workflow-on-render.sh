#!/usr/bin/env bash
# Creates this repo's Workflow service on Render (CLI 2.16+).
# Prerequisites: render login, repo already pushed to GitHub.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ojusave/render-workflows-mastra}"
WORKFLOW_NAME="${WORKFLOW_NAME:-render-workflows-mastra-workflow}"
RENDER_REGION="${RENDER_REGION:-oregon}"

if ! command -v render >/dev/null 2>&1; then
  echo "render CLI not found. Install from https://render.com/docs/cli (need 2.16+)."
  exit 1
fi

if [[ -n "${RENDER_WORKSPACE:-}" ]]; then
  render workspace set "$RENDER_WORKSPACE" --confirm -o text
fi

render workflows create \
  --name "$WORKFLOW_NAME" \
  --repo "$REPO_URL" \
  --branch main \
  --runtime node \
  --build-command "npm install && npm run build" \
  --run-command "node dist/tasks/index.js" \
  --region "$RENDER_REGION" \
  --confirm \
  -o json

echo ""
echo "Set MASTRA_MODEL and the matching provider API key on the workflow service."
echo "Set WORKFLOW_SLUG on the web service to this workflow's slug."
