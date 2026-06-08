import { describe, expect, it } from "vitest";
import { detectThemes, parseGitLog } from "../server/git";

describe("git parsing", () => {
  it("parses git log records with numstat files", () => {
    const output =
      "\x1eabc1234\x1fAda Lovelace\x1fada@example.com\x1f2026-01-02T10:00:00Z\x1ffix weird button romance\n" +
      "12\t3\tsrc/Button.tsx\n" +
      "1\t0\tREADME.md\n" +
      "\x1edef5678\x1fGrace Hopper\x1fgrace@example.com\x1f2026-01-03T10:00:00Z\x1frefactor server cache\n" +
      "8\t9\tserver/cache.ts\n";

    const commits = parseGitLog(output);

    expect(commits).toHaveLength(2);
    expect(commits[0].authorName).toBe("Ada Lovelace");
    expect(commits[0].files[0]).toMatchObject({ path: "src/Button.tsx", additions: 12, deletions: 3 });
    expect(commits[0].themes).toContain("fix");
    expect(commits[0].themes).toContain("frontend");
    expect(commits[1].themes).toContain("backend");
  });

  it("detects comedy-relevant themes from messages and paths", () => {
    expect(detectThemes("temporary hack TODO for css component tests")).toEqual(
      expect.arrayContaining(["chaos", "frontend", "tests"])
    );
  });
});
