export type FantasyMode =
  | "finance"
  | "vibes"
  | "backend-frontend"
  | "kittens"
  | "regency"
  | "security-gothic";

export interface CommitFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export interface CommitEvidence {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmailHash: string;
  date: string;
  subject: string;
  body: string;
  files: CommitFileStat[];
  comments: string[];
  diffSnippets: string[];
  themes: string[];
}

export interface AuthorProfile {
  id: string;
  name: string;
  emailHash: string;
  commitCount: number;
  firstDate: string;
  lastDate: string;
  topFiles: string[];
  topLanguages: string[];
  themes: Record<string, number>;
  frontendScore: number;
  backendScore: number;
  chaosIndex: number;
  sampleCommits: CommitEvidence[];
}

export interface MatchResult {
  id: string;
  authors: [AuthorProfile, AuthorProfile];
  score: number;
  breakdown: {
    sharedFiles: number;
    complementaryStack: number;
    timelineOverlap: number;
    messageChemistry: number;
    chaosHarmony: number;
  };
  evidence: CommitEvidence[];
  greenFlags: string[];
  redFlags: string[];
  summary: string;
}

export interface AnalysisResult {
  id: string;
  repoPath: string;
  repoName: string;
  analyzedAt: string;
  commitLimit: number | "all";
  commitCount: number;
  authorCount: number;
  topThemes: string[];
  profiles: AuthorProfile[];
  matches: MatchResult[];
}

export interface FantasyResult {
  id: string;
  matchId: string;
  mode: FantasyMode;
  title: string;
  fantasy: string;
  pullQuote: string;
  commitReceipts: string[];
  jokes: string[];
  usedOpenAI: boolean;
  model?: string;
}

export interface AnalyzeRequest {
  repoPath?: string;
  demoRepo?: "react";
  commitLimit?: number | "all";
}

export interface FantasyRequest {
  analysisId: string;
  matchId: string;
  mode: FantasyMode;
}

export const fantasyModes: Array<{ id: FantasyMode; label: string; tagline: string }> = [
  { id: "finance", label: "Finance Bro Love", tagline: "Q3 synergy, term sheets, and suspicious fleece." },
  { id: "vibes", label: "Vibe Coders", tagline: "It compiled because they believed." },
  { id: "backend-frontend", label: "Backend To Frontend", tagline: "JSON bouquets and CSS confessionals." },
  { id: "kittens", label: "Shared Love Of Kittens", tagline: "Purr requests, yarn installs, soft paws." },
  { id: "regency", label: "Merge Conflict Regency", tagline: "Forbidden rebases and longing glances." },
  { id: "security-gothic", label: "Security Audit Gothic", tagline: "Haunted logs and suspicious TODOs." }
];
