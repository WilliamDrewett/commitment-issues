import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AnalysisResult, FantasyMode, FantasyResult, MatchResult } from "../shared/types";
import { fantasyModes } from "../shared/types";
import "./styles.css";

type AnalyzeState = "idle" | "analyzing" | "ready" | "error";

const DEFAULT_REPO_INPUT = "facebook/react";

function App() {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO_INPUT);
  const [commitLimit, setCommitLimit] = useState<"350" | "900" | "all">("350");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [mode, setMode] = useState<FantasyMode>("vibes");
  const [fantasy, setFantasy] = useState<FantasyResult | null>(null);
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>("idle");
  const [fantasyLoading, setFantasyLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedMatch = useMemo(() => {
    if (!analysis) return null;
    return analysis.matches.find((match) => match.id === selectedMatchId) ?? analysis.matches[0] ?? null;
  }, [analysis, selectedMatchId]);

  async function analyze(useDemo = false) {
    setAnalyzeState("analyzing");
    setError("");
    setFantasy(null);
    try {
      const body = {
        repoPath: useDemo ? undefined : repoPath,
        demoRepo: useDemo ? "react" : undefined,
        commitLimit: commitLimit === "all" ? "all" : Number(commitLimit)
      };
      const result = await api<AnalysisResult>("/api/analyze", body);
      setAnalysis(result);
      setSelectedMatchId(result.matches[0]?.id ?? null);
      setAnalyzeState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setAnalyzeState("error");
    }
  }

  async function generate(match = selectedMatch, selectedMode = mode) {
    if (!analysis || !match) return;
    setFantasyLoading(true);
    setError("");
    try {
      const result = await api<FantasyResult>("/api/fantasy", {
        analysisId: analysis.id,
        matchId: match.id,
        mode: selectedMode
      });
      setFantasy(result);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setFantasyLoading(false);
    }
  }

  function pickMatch(match: MatchResult) {
    setSelectedMatchId(match.id);
    setFantasy(null);
  }

  return (
    <main className="app">
      <section className="workspace">
        <header className="masthead">
          <div>
            <p className="eyebrow">Commitment Issues</p>
            <h1>Find love in a git history that should probably be in therapy.</h1>
          </div>
          <StatusBadge state={analyzeState} />
        </header>

        <section className="analyzer" aria-label="Repository analyzer">
          <div className="path-row">
            <label htmlFor="repo-path">Repo path or URL</label>
            <input
              id="repo-path"
              value={repoPath}
              onChange={(event) => setRepoPath(event.target.value)}
              placeholder="/Users/you/code/repo or https://github.com/owner/repo"
            />
          </div>
          <div className="control-row">
            <div className="segmented" aria-label="Commit limit">
              {(["350", "900", "all"] as const).map((limit) => (
                <button
                  key={limit}
                  className={commitLimit === limit ? "active" : ""}
                  onClick={() => setCommitLimit(limit)}
                  type="button"
                >
                  {limit === "all" ? "All commits" : `${limit} commits`}
                </button>
              ))}
            </div>
            <button className="secondary" type="button" onClick={() => analyze(true)} disabled={analyzeState === "analyzing"}>
              Use React Demo Repo
            </button>
            <button className="primary" type="button" onClick={() => analyze(false)} disabled={analyzeState === "analyzing"}>
              {analyzeState === "analyzing" ? "Reading emotional diffs..." : "Analyze Chemistry"}
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </section>

        {analysis ? (
          <section className="results">
            <Summary analysis={analysis} />
            <div className="dashboard">
              <MatchList matches={analysis.matches} selectedId={selectedMatch?.id ?? ""} onSelect={pickMatch} />
              {selectedMatch ? (
                <MatchDetail
                  analysis={analysis}
                  match={selectedMatch}
                  mode={mode}
                  fantasy={fantasy}
                  loading={fantasyLoading}
                  onMode={(nextMode) => {
                    setMode(nextMode);
                    setFantasy(null);
                  }}
                  onGenerate={() => generate()}
                />
              ) : null}
            </div>
          </section>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

function StatusBadge({ state }: { state: AnalyzeState }) {
  const label =
    state === "analyzing" ? "Analyzing" : state === "ready" ? "Cupid compiled" : state === "error" ? "Needs a rebase" : "Ready";
  return <span className={`status ${state}`}>{label}</span>;
}

function Summary({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="summary-band">
      <Metric value={analysis.repoName} label="Repo" />
      <Metric value={analysis.commitCount.toLocaleString()} label="Commits inspected" />
      <Metric value={analysis.authorCount.toLocaleString()} label="Authors profiled" />
      <Metric value={analysis.matches.length.toLocaleString()} label="Matches ranked" />
      <div className="theme-strip">
        {analysis.topThemes.map((theme) => (
          <span key={theme}>{theme}</span>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MatchList({
  matches,
  selectedId,
  onSelect
}: {
  matches: MatchResult[];
  selectedId: string;
  onSelect: (match: MatchResult) => void;
}) {
  return (
    <aside className="match-list" aria-label="Ranked matches">
      <div className="panel-heading">
        <h2>Potential love matches</h2>
        <span>{matches.length}</span>
      </div>
      <div className="match-scroll">
        {matches.map((match, index) => (
          <button
            type="button"
            className={`match-card ${match.id === selectedId ? "selected" : ""}`}
            key={match.id}
            onClick={() => onSelect(match)}
          >
            <span className="rank">#{index + 1}</span>
            <span className="names">
              {match.authors[0].name}
              <small>+</small>
              {match.authors[1].name}
            </span>
            <span className="score">{match.score}%</span>
            <span className="summary">{match.summary}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MatchDetail({
  analysis,
  match,
  mode,
  fantasy,
  loading,
  onMode,
  onGenerate
}: {
  analysis: AnalysisResult;
  match: MatchResult;
  mode: FantasyMode;
  fantasy: FantasyResult | null;
  loading: boolean;
  onMode: (mode: FantasyMode) => void;
  onGenerate: () => void;
}) {
  const [a, b] = match.authors;
  const shareText = fantasy
    ? `${fantasy.title}\n\n${fantasy.fantasy}\n\n${fantasy.pullQuote}\n\nBuilt by Commitment Issues for ${analysis.repoName}.`
    : "";

  return (
    <section className="detail">
      <div className="couple-header">
        <div>
          <p className="eyebrow">Compatibility {match.score}%</p>
          <h2>
            {a.name} <span>meets</span> {b.name}
          </h2>
          <p>{match.summary}</p>
        </div>
        <div className="commit-badges">
          <span>{a.commitCount} commits</span>
          <span>{b.commitCount} commits</span>
        </div>
      </div>

      <Breakdown match={match} />

      <div className="flags">
        <FlagList title="Green flags" items={match.greenFlags} tone="green" />
        <FlagList title="Red flags" items={match.redFlags} tone="red" />
      </div>

      <div className="mode-tabs" role="tablist" aria-label="Fantasy modes">
        {fantasyModes.map((fantasyMode) => (
          <button
            type="button"
            key={fantasyMode.id}
            className={mode === fantasyMode.id ? "active" : ""}
            onClick={() => onMode(fantasyMode.id)}
            title={fantasyMode.tagline}
          >
            {fantasyMode.label}
          </button>
        ))}
      </div>

      <div className="fantasy-zone">
        <div className="fantasy-actions">
          <button className="primary" type="button" onClick={onGenerate} disabled={loading}>
            {loading ? "Summoning questionable romance..." : fantasy ? "Reroll fantasy" : "Generate fantasy"}
          </button>
          <button className="secondary" type="button" disabled={!fantasy} onClick={() => navigator.clipboard.writeText(shareText)}>
            Copy demo quote
          </button>
          {fantasy ? <span className="source">{fantasy.usedOpenAI ? `OpenAI ${fantasy.model}` : "Fallback comedy engine"}</span> : null}
        </div>
        {fantasy ? <FantasyCard fantasy={fantasy} /> : <Evidence evidence={match.evidence} />}
      </div>
    </section>
  );
}

function Breakdown({ match }: { match: MatchResult }) {
  return (
    <div className="breakdown">
      {Object.entries(match.breakdown).map(([key, value]) => (
        <div className="bar-row" key={key}>
          <span>{humanize(key)}</span>
          <div className="bar">
            <i style={{ width: `${value}%` }} />
          </div>
          <strong>{value}%</strong>
        </div>
      ))}
    </div>
  );
}

function FlagList({ title, items, tone }: { title: string; items: string[]; tone: "green" | "red" }) {
  return (
    <div className={`flag-list ${tone}`}>
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function Evidence({ evidence }: { evidence: MatchResult["evidence"] }) {
  return (
    <div className="evidence">
      <h3>Commit receipts</h3>
      {evidence.slice(0, 6).map((commit) => (
        <article key={commit.hash}>
          <span>
            {commit.shortHash} · {commit.authorName}
          </span>
          <p>{commit.subject}</p>
          {[...commit.comments, ...commit.diffSnippets].slice(0, 2).map((snippet) => (
            <code key={snippet}>{snippet}</code>
          ))}
        </article>
      ))}
    </div>
  );
}

function FantasyCard({ fantasy }: { fantasy: FantasyResult }) {
  return (
    <article className="fantasy-card">
      <p className="eyebrow">{fantasy.mode}</p>
      <h3>{fantasy.title}</h3>
      <blockquote>{fantasy.pullQuote}</blockquote>
      <p>{fantasy.fantasy}</p>
      <div className="receipt-grid">
        {fantasy.commitReceipts.map((receipt) => (
          <code key={receipt}>{receipt}</code>
        ))}
      </div>
      <div className="jokes">
        {fantasy.jokes.map((joke) => (
          <span key={joke}>{joke}</span>
        ))}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <section className="empty">
      <div>
        <h2>How the demo wins the room</h2>
        <p>
          Point this at a repo with multiple authors, hit analyze, pick the funniest match, then generate a fantasy mode live.
          If the OpenAI key behaves, the model improvises. If it sulks, the fallback comedy engine still lands the bit.
        </p>
      </div>
      <div className="mini-script">
        <span>1. Analyze repo</span>
        <span>2. Rank commit chemistry</span>
        <span>3. Read the receipts</span>
        <span>4. Ship romance to main</span>
      </div>
    </section>
  );
}

async function api<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload as T;
}

function humanize(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
