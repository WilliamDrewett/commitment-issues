import type { AuthorProfile, CommitEvidence, MatchResult } from "../shared/types";

const FRONTEND_EXTENSIONS = new Set([".css", ".scss", ".html", ".jsx", ".tsx", ".vue", ".svelte"]);
const BACKEND_EXTENSIONS = new Set([".go", ".rs", ".py", ".rb", ".java", ".php", ".sql", ".graphql"]);

export function buildProfiles(commits: CommitEvidence[]): AuthorProfile[] {
  const grouped = new Map<string, CommitEvidence[]>();
  for (const commit of commits) {
    const id = `${commit.authorName}:${commit.authorEmailHash}`;
    grouped.set(id, [...(grouped.get(id) ?? []), commit]);
  }

  return [...grouped.entries()]
    .map(([id, authorCommits]) => makeProfile(id, authorCommits))
    .sort((a, b) => b.commitCount - a.commitCount);
}

export function buildMatches(profiles: AuthorProfile[], commits: CommitEvidence[]): MatchResult[] {
  const matches: MatchResult[] = [];
  for (let i = 0; i < profiles.length; i += 1) {
    for (let j = i + 1; j < profiles.length; j += 1) {
      matches.push(makeMatch(profiles[i], profiles[j], commits));
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 24);
}

function makeProfile(id: string, commits: CommitEvidence[]): AuthorProfile {
  const sorted = [...commits].sort((a, b) => a.date.localeCompare(b.date));
  const fileCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  const themeCounts: Record<string, number> = {};
  let frontendHits = 0;
  let backendHits = 0;
  let chaosHits = 0;

  for (const commit of commits) {
    for (const theme of commit.themes) {
      themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
    }
    if (/!|wip|todo|hack|revert|oops|panic|temporary|please|why/i.test(commit.subject)) chaosHits += 1;
    for (const file of commit.files) {
      fileCounts.set(file.path, (fileCounts.get(file.path) ?? 0) + 1);
      const ext = extensionOf(file.path);
      if (ext) languageCounts.set(ext.replace(".", ""), (languageCounts.get(ext.replace(".", "")) ?? 0) + 1);
      if (FRONTEND_EXTENSIONS.has(ext) || /\/(components|client|ui|dom)\//i.test(file.path)) frontendHits += 1;
      if (BACKEND_EXTENSIONS.has(ext) || /\/(server|api|db|database|packages)\//i.test(file.path)) backendHits += 1;
    }
  }

  return {
    id,
    name: commits[0]?.authorName ?? "Anonymous Committer",
    emailHash: commits[0]?.authorEmailHash ?? id,
    commitCount: commits.length,
    firstDate: sorted[0]?.date ?? "",
    lastDate: sorted.at(-1)?.date ?? "",
    topFiles: topEntries(fileCounts, 8),
    topLanguages: topEntries(languageCounts, 5),
    themes: themeCounts,
    frontendScore: normalize(frontendHits, commits.length * 4),
    backendScore: normalize(backendHits, commits.length * 4),
    chaosIndex: Math.round(normalize(chaosHits + (themeCounts.chaos ?? 0), commits.length * 2)),
    sampleCommits: commits.slice(0, 4)
  };
}

function makeMatch(a: AuthorProfile, b: AuthorProfile, commits: CommitEvidence[]): MatchResult {
  const sharedFiles = countOverlap(a.topFiles, b.topFiles);
  const complementaryStack = Math.round(
    Math.min(100, Math.abs(a.frontendScore - b.frontendScore) * 0.5 + Math.abs(a.backendScore - b.backendScore) * 0.5)
  );
  const timelineOverlap = dateOverlapScore(a, b);
  const messageChemistry = themeOverlapScore(a.themes, b.themes);
  const chaosHarmony = Math.max(0, 100 - Math.abs(a.chaosIndex - b.chaosIndex) * 2);
  const score = Math.round(
    sharedFiles * 1.6 + complementaryStack * 0.22 + timelineOverlap * 0.24 + messageChemistry * 0.26 + chaosHarmony * 0.18
  );

  const evidence = pickEvidence(a, b, commits);
  const pair = [a, b] as [AuthorProfile, AuthorProfile];
  return {
    id: `${a.emailHash}-${b.emailHash}`,
    authors: pair,
    score: Math.max(12, Math.min(99, score)),
    breakdown: {
      sharedFiles: Math.min(100, sharedFiles * 18),
      complementaryStack,
      timelineOverlap,
      messageChemistry,
      chaosHarmony
    },
    evidence,
    greenFlags: greenFlags(a, b, sharedFiles, complementaryStack),
    redFlags: redFlags(a, b),
    summary: `${a.name} and ${b.name} share ${sharedFiles} suspiciously intimate file paths and ${messageChemistry}% message chemistry.`
  };
}

function pickEvidence(a: AuthorProfile, b: AuthorProfile, commits: CommitEvidence[]): CommitEvidence[] {
  const ids = new Set([a.id, b.id]);
  return commits
    .filter((commit) => ids.has(`${commit.authorName}:${commit.authorEmailHash}`))
    .sort((left, right) => evidenceScore(right) - evidenceScore(left))
    .slice(0, 10);
}

function evidenceScore(commit: CommitEvidence): number {
  return (
    commit.themes.length * 4 +
    commit.comments.length * 8 +
    commit.diffSnippets.length * 4 +
    (/fix|revert|hack|weird|todo|love|panic|remove/i.test(commit.subject) ? 20 : 0)
  );
}

function greenFlags(a: AuthorProfile, b: AuthorProfile, sharedFiles: number, complementaryStack: number): string[] {
  const flags = [
    sharedFiles > 0
      ? "They have both touched the same files, which is basically holding hands in version control."
      : "They have separate domains, perfect for maintaining mystery and avoiding merge conflicts at brunch.",
    complementaryStack > 45
      ? "One brings stack-range mystique while the other brings implementation eye contact."
      : "They share enough technical taste to nod thoughtfully at the same pull request.",
    `Combined chaos index: ${a.chaosIndex + b.chaosIndex}. High enough for banter, low enough for deploys.`
  ];
  return flags;
}

function redFlags(a: AuthorProfile, b: AuthorProfile): string[] {
  const flags = [];
  if ((a.themes.chaos ?? 0) + (b.themes.chaos ?? 0) > 6) {
    flags.push("Several commits appear to be emotionally load-bearing TODOs.");
  }
  if (Math.abs(a.commitCount - b.commitCount) > Math.max(10, Math.min(a.commitCount, b.commitCount) * 2)) {
    flags.push("One of them commits like a daily diary; the other is cultivating an air of mystery.");
  }
  flags.push("May describe a date as 'just a quick refactor' and vanish for six hours.");
  return flags.slice(0, 3);
}

function themeOverlapScore(a: Record<string, number>, b: Record<string, number>): number {
  const themes = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (themes.size === 0) return 35;
  let overlap = 0;
  let total = 0;
  for (const theme of themes) {
    overlap += Math.min(a[theme] ?? 0, b[theme] ?? 0);
    total += Math.max(a[theme] ?? 0, b[theme] ?? 0);
  }
  return Math.round((overlap / Math.max(1, total)) * 100);
}

function dateOverlapScore(a: AuthorProfile, b: AuthorProfile): number {
  const aStart = new Date(a.firstDate).getTime();
  const aEnd = new Date(a.lastDate).getTime();
  const bStart = new Date(b.firstDate).getTime();
  const bEnd = new Date(b.lastDate).getTime();
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return 40;
  const overlap = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
  const span = Math.max(1, Math.max(aEnd, bEnd) - Math.min(aStart, bStart));
  return Math.round((overlap / span) * 100);
}

function countOverlap(a: string[], b: string[]): number {
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item)).length;
}

function topEntries(map: Map<string, number>, limit: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function extensionOf(filePath: string): string {
  const ext = filePath.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
  return ext ?? "";
}

function normalize(value: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
}
