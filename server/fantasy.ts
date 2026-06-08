import { randomUUID } from "node:crypto";
import type { FantasyMode, FantasyResult, MatchResult } from "../shared/types";

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

export async function generateFantasy(match: MatchResult, mode: FantasyMode): Promise<FantasyResult> {
  const fallback = makeFallbackFantasy(match, mode);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: buildPrompt(match, mode),
        max_output_tokens: 1400
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const text = extractOutputText(data);
    const parsed = parseFantasyJson(text);
    return {
      ...fallback,
      ...parsed,
      id: randomUUID(),
      matchId: match.id,
      mode,
      usedOpenAI: true,
      model
    };
  } catch (error) {
    return {
      ...fallback,
      jokes: [
        ...fallback.jokes,
        `OpenAI had stage fright, so the fallback engine shipped anyway: ${(error as Error).message}`
      ]
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function makeFallbackFantasy(match: MatchResult, mode: FantasyMode): FantasyResult {
  const [a, b] = match.authors;
  const receiptA = match.evidence.find((commit) => commit.authorEmailHash === a.emailHash)?.subject ?? a.sampleCommits[0]?.subject;
  const receiptB = match.evidence.find((commit) => commit.authorEmailHash === b.emailHash)?.subject ?? b.sampleCommits[0]?.subject;
  const comments = match.evidence.flatMap((commit) => commit.comments).slice(0, 2);
  const snippets = match.evidence.flatMap((commit) => commit.diffSnippets).slice(0, 2);
  const receipts = [receiptA, receiptB, ...comments, ...snippets].filter(Boolean).slice(0, 5) as string[];
  const detail = receipts.length ? ` Their vows cite "${receipts[0]}" because apparently romance now has audit logs.` : "";

  const modeCopy: Record<FantasyMode, { title: string; fantasy: string; quote: string; jokes: string[] }> = {
    finance: {
      title: `${a.name} x ${b.name}: Series A Feelings`,
      fantasy: `${a.name} walks into the standup wearing the emotional equivalent of a Patagonia vest. ${b.name} asks about runway, but means "will you still review my PR after lunch?" Their Q3 synergy exceeds guidance, their vesting cliff becomes a scenic overlook, and the term sheet is mostly heart emojis with one alarming TODO.${detail}`,
      quote: "This relationship has recurring revenue and unresolved tension.",
      jokes: ["Their love language is EBITDA: Emotionally Backed Intense Diff-Based Technical Affection.", "The board approves the merger, pending lint."]
    },
    vibes: {
      title: `${a.name} x ${b.name}: npm install destiny`,
      fantasy: `${a.name} ships by aura. ${b.name} debugs by moonlight. Together they open a terminal, whisper "it compiled because we believed," and the CI pipeline blushes. No one understands the architecture, but the vibes have 100% test coverage.${detail}`,
      quote: "They did not fix the bug; they raised its vibration.",
      jokes: ["The roadmap is a scented candle with Jira permissions.", "Pair programming, but one of them is just saying 'ship it' near a fern."]
    },
    "backend-frontend": {
      title: `${a.name} x ${b.name}: JSON Bouquets`,
      fantasy: `${a.name} sends an API contract across the wire. ${b.name} renders it beautifully, adds a hover state, and pretends not to notice the nullable feelings. Their first date is a schema migration; dessert is CSS that finally centers.${detail}`,
      quote: "He returned 200 OK, but she knew he meant forever.",
      jokes: ["The backend brought pagination; the frontend brought drama.", "Their children will be named Props and Payload."]
    },
    kittens: {
      title: `${a.name} x ${b.name}: Purr Request Approved`,
      fantasy: `${a.name} and ${b.name} meet in a sunbeam next to a dangerously warm laptop. Someone runs yarn, someone else knocks a flaky test off the table, and suddenly every commit has tiny paw prints. They merge softly, with excellent boundaries and one suspiciously adorable cache invalidation.${detail}`,
      quote: "Love is temporary, but a purring build cache is forever.",
      jokes: ["They practice test-driven development: Tummy, Dinner, Development.", "The only production incident is too much softness in main."]
    },
    regency: {
      title: `${a.name} x ${b.name}: A Most Improper Rebase`,
      fantasy: `It is a truth universally acknowledged that a developer in possession of a failing branch must be in want of a reviewer. ${a.name} meets ${b.name} across a ballroom of unresolved conflicts. Their hands almost touch over the semicolon. Society gasps. Git accepts theirs.${detail}`,
      quote: "Reader, they force-pushed.",
      jokes: ["The dowager countess disapproves of squash merges.", "A carriage arrives bearing only one note: 'fix tests'."]
    },
    "security-gothic": {
      title: `${a.name} x ${b.name}: Secrets In The Logfile`,
      fantasy: `The repo is old, the hallway is dark, and somewhere a TODO whispers from beneath the floorboards. ${a.name} finds a suspicious token. ${b.name} finds a stack trace shaped like longing. Together they rotate credentials and feelings with equal urgency.${detail}`,
      quote: "The real vulnerability was emotional exposure.",
      jokes: ["Their meet-cute is an audit finding with excellent bone structure.", "Nothing says romance like deleting secrets from history."]
    }
  };

  const copy = modeCopy[mode];
  return {
    id: randomUUID(),
    matchId: match.id,
    mode,
    title: copy.title,
    fantasy: copy.fantasy,
    pullQuote: copy.quote,
    commitReceipts: receipts,
    jokes: copy.jokes,
    usedOpenAI: false
  };
}

function buildPrompt(match: MatchResult, mode: FantasyMode): string {
  const [a, b] = match.authors;
  const evidence = match.evidence.slice(0, 8).map((commit) => ({
    author: commit.authorName,
    hash: commit.shortHash,
    subject: commit.subject,
    themes: commit.themes,
    comments: commit.comments.slice(0, 3),
    snippets: commit.diffSnippets.slice(0, 3),
    files: commit.files.slice(0, 5).map((file) => file.path)
  }));

  return `You are writing for a hackathon app called Commitment Issues. Generate PG-13 chaotic comedy, flirty but not explicit, never mean-spirited.

Fantasy mode: ${mode}
Match:
- ${a.name}: ${a.commitCount} commits, languages ${a.topLanguages.join(", ") || "unknown"}, chaos ${a.chaosIndex}
- ${b.name}: ${b.commitCount} commits, languages ${b.topLanguages.join(", ") || "unknown"}, chaos ${b.chaosIndex}
Score: ${match.score}
Green flags: ${match.greenFlags.join(" | ")}
Red flags: ${match.redFlags.join(" | ")}
Evidence JSON: ${JSON.stringify(evidence)}

Return only valid JSON with this exact shape:
{
  "title": "short hilarious title",
  "fantasy": "one punchy 120-180 word fantasy drawing directly on commit subjects, comments, snippets, and the selected mode",
  "pullQuote": "one quotable line",
  "commitReceipts": ["3-5 short receipts, each grounded in evidence"],
  "jokes": ["2-4 extra one-line jokes"]
}`;
}

function extractOutputText(data: OpenAIResponse): string {
  if (data.output_text) return data.output_text;
  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n") ?? ""
  );
}

function parseFantasyJson(text: string): Partial<FantasyResult> {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<FantasyResult>;
  return {
    title: String(parsed.title ?? "Commitment Issues"),
    fantasy: String(parsed.fantasy ?? ""),
    pullQuote: String(parsed.pullQuote ?? ""),
    commitReceipts: Array.isArray(parsed.commitReceipts) ? parsed.commitReceipts.map(String).slice(0, 5) : [],
    jokes: Array.isArray(parsed.jokes) ? parsed.jokes.map(String).slice(0, 4) : []
  };
}
