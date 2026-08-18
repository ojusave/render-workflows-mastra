import { Mastra } from "@mastra/core";
import { editorAgent, reviewerAgent } from "./agents.js";

/** Shared Mastra instance so tasks get logging and other app services. */
export const mastra = new Mastra({
  agents: {
    editorAgent,
    reviewerAgent,
  },
});
