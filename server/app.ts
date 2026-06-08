import express from "express";
import { z } from "zod";
import { fantasyModes, type FantasyMode } from "../shared/types";
import { generateFantasy } from "./fantasy";
import { analyzeRepository, loadAnalysis } from "./git";

const analyzeSchema = z.object({
  repoPath: z.string().optional(),
  demoRepo: z.literal("react").optional(),
  commitLimit: z.union([z.number().int().min(2).max(3000), z.literal("all")]).optional()
});

const fantasySchema = z.object({
  analysisId: z.string().min(1),
  matchId: z.string().min(1),
  mode: z.enum(fantasyModes.map((mode) => mode.id) as [FantasyMode, ...FantasyMode[]])
});

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL || "gpt-5.5"
    });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const body = analyzeSchema.parse(req.body);
      const analysis = await analyzeRepository(body);
      res.json(analysis);
    } catch (error) {
      res.status(400).json({ error: messageOf(error) });
    }
  });

  app.get("/api/analysis/:analysisId", async (req, res) => {
    const analysis = await loadAnalysis(req.params.analysisId);
    if (!analysis) {
      res.status(404).json({ error: "Analysis not found. Even love needs a cache key." });
      return;
    }
    res.json(analysis);
  });

  app.post("/api/fantasy", async (req, res) => {
    try {
      const body = fantasySchema.parse(req.body);
      const analysis = await loadAnalysis(body.analysisId);
      const match = analysis?.matches.find((candidate) => candidate.id === body.matchId);
      if (!analysis || !match) {
        res.status(404).json({ error: "Match not found. The chemistry may have rebased itself." });
        return;
      }
      const fantasy = await generateFantasy(match, body.mode);
      res.json(fantasy);
    } catch (error) {
      res.status(400).json({ error: messageOf(error) });
    }
  });

  return app;
}

function messageOf(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map((issue) => issue.message).join(", ");
  return error instanceof Error ? error.message : "Something went sideways in the romance compiler.";
}
