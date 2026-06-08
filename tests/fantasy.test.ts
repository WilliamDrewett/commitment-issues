import { describe, expect, it } from "vitest";
import type { AuthorProfile, MatchResult } from "../shared/types";
import { fantasyModes } from "../shared/types";
import { makeFallbackFantasy } from "../server/fantasy";

const author = (name: string, hash: string): AuthorProfile => ({
  id: `${name}:${hash}`,
  name,
  emailHash: hash,
  commitCount: 12,
  firstDate: "2026-01-01T00:00:00Z",
  lastDate: "2026-01-10T00:00:00Z",
  topFiles: ["src/App.tsx"],
  topLanguages: ["tsx"],
  themes: { fix: 3, frontend: 4 },
  frontendScore: 80,
  backendScore: 20,
  chaosIndex: 22,
  sampleCommits: []
});

const match: MatchResult = {
  id: "ada-grace",
  authors: [author("Ada", "ada"), author("Grace", "grace")],
  score: 88,
  breakdown: {
    sharedFiles: 80,
    complementaryStack: 70,
    timelineOverlap: 60,
    messageChemistry: 65,
    chaosHarmony: 90
  },
  evidence: [
    {
      hash: "abc123",
      shortHash: "abc123",
      authorName: "Ada",
      authorEmailHash: "ada",
      date: "2026-01-01T00:00:00Z",
      subject: "fix weird button flirtation",
      body: "",
      files: [{ path: "src/App.tsx", additions: 4, deletions: 1 }],
      comments: ["TODO: make this less emotionally complex"],
      diffSnippets: ["const love = compileFeelings();"],
      themes: ["fix", "frontend", "chaos"]
    }
  ],
  greenFlags: ["They have both touched the same files."],
  redFlags: ["May describe a date as just a quick refactor."],
  summary: "Ada and Grace have suspicious chemistry."
};

describe("fallback fantasies", () => {
  it("generates every mode without OpenAI", () => {
    for (const mode of fantasyModes) {
      const fantasy = makeFallbackFantasy(match, mode.id);
      expect(fantasy.mode).toBe(mode.id);
      expect(fantasy.title.length).toBeGreaterThan(8);
      expect(fantasy.fantasy).toContain("Ada");
      expect(fantasy.commitReceipts.length).toBeGreaterThan(0);
      expect(fantasy.usedOpenAI).toBe(false);
    }
  });
});
