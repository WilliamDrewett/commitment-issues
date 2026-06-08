import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { AnalysisResult, AnalyzeRequest, CommitEvidence } from "../shared/types";
import { buildMatches, buildProfiles } from "./matchmaking";

const execFileAsync = promisify(execFile);
const FIELD = "\x1f";
const RECORD = "\x1e";
const DEMO_REPO_URL = "https://github.com/facebook/react.git";
const DEFAULT_LIMIT = 120;
const CACHE_DIR = path.resolve(process.cwd(), ".cache");
const ANALYSIS_DIR = path.join(CACHE_DIR, "analyses");
const REPO_CACHE_DIR = path.join(CACHE_DIR, "repos");

export async function analyzeRepository(request: AnalyzeRequest): Promise<AnalysisResult> {
  const source = await resolveRepoPath(request);
  const repoPath = source.repoPath;
  await ensureGitRepo(repoPath);
  const commitLimit = normalizeCommitLimit(request.commitLimit, source.remote);
  const commits = await readCommitHistory(repoPath, commitLimit);

  if (commits.length < 2) {
    throw new Error("This repo needs at least two commits before the romance engine can make eye contact.");
  }

  const enriched = source.remote ? commits : await addSelectedDiffEvidence(repoPath, commits);
  const profiles = buildProfiles(enriched);
  if (profiles.length < 2) {
    throw new Error("This repo only has one visible author. Beautiful, but currently a solo polyrepo relationship.");
  }

  const matches = buildMatches(profiles, enriched);
  const analysis: AnalysisResult = {
    id: randomUUID(),
    repoPath,
    repoName: path.basename(repoPath),
    analyzedAt: new Date().toISOString(),
    commitLimit,
    commitCount: enriched.length,
    authorCount: profiles.length,
    topThemes: topThemes(enriched),
    profiles,
    matches
  };

  await mkdir(ANALYSIS_DIR, { recursive: true });
  await writeFile(path.join(ANALYSIS_DIR, `${analysis.id}.json`), JSON.stringify(analysis, null, 2));
  return analysis;
}

export async function loadAnalysis(id: string): Promise<AnalysisResult | null> {
  try {
    const file = await readFile(path.join(ANALYSIS_DIR, `${id}.json`), "utf8");
    return JSON.parse(file) as AnalysisResult;
  } catch {
    return null;
  }
}

async function resolveRepoPath(request: AnalyzeRequest): Promise<{ repoPath: string; remote: boolean }> {
  if (request.demoRepo === "react") {
    return { repoPath: await prepareRemoteRepo(DEMO_REPO_URL, "react"), remote: true };
  }
  if (!request.repoPath?.trim()) {
    throw new Error("Give me a local git repo path, a public GitHub URL, or press the React demo button. The app is needy like that.");
  }
  const input = request.repoPath.trim();
  if (isGitHubInput(input)) {
    return { repoPath: await prepareRemoteRepo(input), remote: true };
  }
  return { repoPath: path.resolve(input.replace(/^~/, process.env.HOME ?? "~")), remote: false };
}

async function prepareRemoteRepo(repoInput: string, forcedName?: string): Promise<string> {
  await mkdir(REPO_CACHE_DIR, { recursive: true });
  const repoUrl = normalizeGitHubUrl(repoInput);
  const target = path.join(REPO_CACHE_DIR, forcedName ?? cacheNameForUrl(repoUrl));
  const exists = await pathExists(path.join(target, ".git"));

  if (!exists) {
    await rm(target, { recursive: true, force: true });
    await run("git", ["clone", "--depth=160", "--filter=blob:none", repoUrl, target], process.cwd(), 120000);
  }

  return target;
}

function normalizeCommitLimit(limit: AnalyzeRequest["commitLimit"], remote: boolean): number | "all" {
  if (limit === "all") return remote ? 160 : "all";
  const fallback = remote ? 120 : DEFAULT_LIMIT;
  const numeric = limit ?? fallback;
  return remote ? Math.max(20, Math.min(numeric, 160)) : numeric;
}

function isGitHubInput(input: string): boolean {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/i.test(input) || /^[\w.-]+\/[\w.-]+$/.test(input);
}

function normalizeGitHubUrl(input: string): string {
  const trimmed = input.trim().replace(/\/$/, "");
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
    return `https://github.com/${trimmed}.git`;
  }
  const match = trimmed.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i);
  if (!match) {
    throw new Error("Only public GitHub repos are supported for URL cloning. Try https://github.com/facebook/react.");
  }
  return `https://github.com/${match[1]}/${match[2]}.git`;
}

function cacheNameForUrl(repoUrl: string): string {
  const match = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)\.git$/i);
  if (!match) return createHash("sha256").update(repoUrl).digest("hex").slice(0, 12);
  if (match[1].toLowerCase() === "facebook" && match[2].toLowerCase() === "react") return "react";
  return `${match[1]}-${match[2]}`.replace(/[^\w.-]/g, "-").toLowerCase();
}

async function ensureGitRepo(repoPath: string): Promise<void> {
  const info = await stat(repoPath).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`I cannot find that repo path: ${repoPath}`);
  }
  await run("git", ["rev-parse", "--is-inside-work-tree"], repoPath);
}

export async function readCommitHistory(repoPath: string, limit: number | "all" = DEFAULT_LIMIT): Promise<CommitEvidence[]> {
  const args = [
    "log",
    "--all",
    "--date=iso-strict",
    `--pretty=format:${RECORD}%H${FIELD}%an${FIELD}%ae${FIELD}%ad${FIELD}%s`,
    "--numstat"
  ];
  if (limit !== "all") {
    args.push(`--max-count=${Math.max(2, Math.min(limit, 3000))}`);
  }

  const output = await run("git", args, repoPath, 120000);
  return parseGitLog(output);
}

export function parseGitLog(output: string): CommitEvidence[] {
  return output
    .split(RECORD)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\r?\n/);
      const header = lines.shift() ?? "";
      const [hash, authorName, authorEmail, date, subject] = header.split(FIELD);
      const files = lines
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [additionsRaw, deletionsRaw, ...fileParts] = line.split(/\s+/);
          return {
            path: fileParts.join(" "),
            additions: additionsRaw === "-" ? 0 : Number(additionsRaw) || 0,
            deletions: deletionsRaw === "-" ? 0 : Number(deletionsRaw) || 0
          };
        })
        .filter((file) => file.path);

      return {
        hash,
        shortHash: hash.slice(0, 7),
        authorName: authorName || "Anonymous Committer",
        authorEmailHash: hashEmail(authorEmail || authorName || "unknown"),
        date,
        subject: subject || "(no subject, just unresolved feelings)",
        body: "",
        files,
        comments: [],
        diffSnippets: [],
        themes: detectThemes(`${subject} ${files.map((file) => file.path).join(" ")}`)
      };
    })
    .filter((commit) => commit.hash);
}

async function addSelectedDiffEvidence(repoPath: string, commits: CommitEvidence[]): Promise<CommitEvidence[]> {
  const scored = [...commits]
    .sort((a, b) => interestingness(b) - interestingness(a))
    .slice(0, 28);
  const selected = new Set(scored.map((commit) => commit.hash));

  const enriched = await Promise.all(
    commits.map(async (commit) => {
      if (!selected.has(commit.hash)) return commit;
      const diff = await run(
        "git",
        ["show", "--format=", "--unified=3", "--no-ext-diff", "--max-count=1", commit.hash],
        repoPath,
        8000
      ).catch(() => "");
      const comments = extractComments(diff);
      const diffSnippets = extractDiffSnippets(diff);
      return { ...commit, comments, diffSnippets };
    })
  );

  return enriched;
}

function interestingness(commit: CommitEvidence): number {
  const message = commit.subject.toLowerCase();
  const funnyWords = ["fix", "hack", "oops", "lol", "weird", "panic", "love", "remove", "revert", "todo"];
  const wordScore = funnyWords.reduce((score, word) => score + (message.includes(word) ? 8 : 0), 0);
  const fileScore = Math.min(20, commit.files.length * 2);
  const churn = commit.files.reduce((total, file) => total + file.additions + file.deletions, 0);
  return wordScore + fileScore + Math.min(20, Math.log10(churn + 1) * 10);
}

function extractComments(diff: string): string[] {
  const comments = new Set<string>();
  for (const rawLine of diff.split(/\r?\n/)) {
    const line = rawLine.replace(/^[+-]/, "").trim();
    const match =
      line.match(/^(\/\/|#|--)\s*(.{8,160})/) ??
      line.match(/^\/\*\s*(.{8,160})/) ??
      line.match(/<!--\s*(.{8,160})\s*-->/);
    if (match) {
      const text = (match[2] ?? match[1]).replace(/\*\/$/, "").trim();
      if (!/eslint|license|copyright|generated|prettier/i.test(text)) {
        comments.add(text);
      }
    }
  }
  return [...comments].slice(0, 5);
}

function extractDiffSnippets(diff: string): string[] {
  const snippets: string[] = [];
  for (const rawLine of diff.split(/\r?\n/)) {
    if (!/^[+-][^+-]/.test(rawLine)) continue;
    const line = rawLine.slice(1).trim();
    if (line.length < 12 || line.length > 160) continue;
    if (/^(import|export|const|let|var|function|class|return|if|for|while|throw|await|<\/?[A-Za-z])/.test(line)) {
      snippets.push(line);
    }
    if (snippets.length >= 5) break;
  }
  return snippets;
}

export function detectThemes(text: string): string[] {
  const lower = text.toLowerCase();
  const checks: Array<[string, RegExp]> = [
    ["fix", /\b(fix|bug|patch|repair|resolve)\b/],
    ["refactor", /\b(refactor|cleanup|simplify|rename|remove)\b/],
    ["tests", /\b(tests?|specs?|jest|vitest|e2e)\b/],
    ["docs", /\b(doc|readme|comment|guide)\b/],
    ["build", /\b(build|ci|workflow|release|package|deps?)\b/],
    ["frontend", /\b(ui|css|style|component|dom|html|jsx|tsx)\b/],
    ["backend", /\b(api|server|db|query|cache|auth|http)\b/],
    ["performance", /\b(perf|fast|slow|optimi[sz]e|memo|cache)\b/],
    ["chaos", /\b(hack|oops|revert|panic|weird|temporary|todo|wip)\b/]
  ];
  return checks.filter(([, regex]) => regex.test(lower)).map(([theme]) => theme);
}

function topThemes(commits: CommitEvidence[]): string[] {
  const counts = new Map<string, number>();
  for (const commit of commits) {
    for (const theme of commit.themes) {
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([theme]) => theme);
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 12);
}

async function pathExists(filePath: string): Promise<boolean> {
  return stat(filePath).then(
    () => true,
    () => false
  );
}

async function run(command: string, args: string[], cwd: string, timeout = 60000): Promise<string> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd,
    timeout,
    maxBuffer: 1024 * 1024 * 64
  });
  if (stderr && /fatal:|error:/i.test(stderr)) {
    throw new Error(stderr.trim());
  }
  return stdout;
}
