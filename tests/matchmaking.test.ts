import { describe, expect, it } from "vitest";
import type { CommitEvidence } from "../shared/types";
import { buildMatches, buildProfiles } from "../server/matchmaking";

function commit(partial: Partial<CommitEvidence>): CommitEvidence {
  return {
    hash: partial.hash ?? crypto.randomUUID(),
    shortHash: partial.shortHash ?? "abc1234",
    authorName: partial.authorName ?? "Ada",
    authorEmailHash: partial.authorEmailHash ?? "ada",
    date: partial.date ?? "2026-01-01T10:00:00Z",
    subject: partial.subject ?? "fix button",
    body: "",
    files: partial.files ?? [{ path: "src/Button.tsx", additions: 4, deletions: 1 }],
    comments: partial.comments ?? [],
    diffSnippets: partial.diffSnippets ?? [],
    themes: partial.themes ?? ["fix", "frontend"]
  };
}

describe("matchmaking", () => {
  it("builds profiles and ranks pairs", () => {
    const commits = [
      commit({ authorName: "Ada", authorEmailHash: "ada", subject: "fix button", themes: ["fix", "frontend"] }),
      commit({ authorName: "Ada", authorEmailHash: "ada", subject: "add css tests", themes: ["tests", "frontend"] }),
      commit({
        authorName: "Grace",
        authorEmailHash: "grace",
        subject: "refactor server cache",
        themes: ["refactor", "backend"],
        files: [{ path: "server/cache.ts", additions: 8, deletions: 2 }]
      }),
      commit({
        authorName: "Linus",
        authorEmailHash: "linus",
        subject: "revert weird auth hack",
        themes: ["chaos", "backend"],
        files: [{ path: "server/cache.ts", additions: 2, deletions: 8 }]
      })
    ];

    const profiles = buildProfiles(commits);
    const matches = buildMatches(profiles, commits);

    expect(profiles).toHaveLength(3);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].score).toBeGreaterThan(0);
    expect(matches[0].greenFlags.join(" ")).toContain("pull request");
  });
});
