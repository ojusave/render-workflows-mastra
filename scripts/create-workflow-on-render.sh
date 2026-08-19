#!/usr/bin/env bash
# Creates this repo's Workflow service on Render (CLI 2.16+).
# Prerequisites: render login, repo already pushed to GitHub.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/render-examples/render-workflows-mastra}"
WORKFLOW_NAME="${WORKFLOW_NAME:-render-workflows-mastra-workflow}"
RENDER_REGION="${RENDER_REGION:-oregon}"

if ! command -v render >/dev/null 2>&1; then
  echo "render CLI not found. Install from https://render.com/docs/cli?utm_source=partner&utm_medium=partnerships&utm_campaign=2026_partnership_mastra (need 2.16+)."
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
  --run-command "npm run start:workflows" \
  --region "$RENDER_REGION" \
  --confirm \
  -o json

echo ""
echo "Set OPENAI_API_KEY on the workflow service (agents use openai/gpt-5.6-sol)."
echo "Set WORKFLOW_SLUG on the web service to this workflow's slug."
