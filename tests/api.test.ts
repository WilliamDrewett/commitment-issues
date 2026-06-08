import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app";

let tmpRepo = "";

function git(args: string[]) {
  execFileSync("git", args, { cwd: tmpRepo, stdio: "pipe" });
}

function makeRepo() {
  tmpRepo = mkdtempSync(path.join(tmpdir(), "commitment-issues-"));
  git(["init"]);
  git(["config", "user.name", "Ada"]);
  git(["config", "user.email", "ada@example.com"]);
  writeFileSync(path.join(tmpRepo, "app.tsx"), "// TODO: make button emotionally available\nexport const App = () => null;\n");
  git(["add", "."]);
  git(["commit", "-m", "fix weird button feelings"]);
  git(["config", "user.name", "Grace"]);
  git(["config", "user.email", "grace@example.com"]);
  writeFileSync(path.join(tmpRepo, "server.ts"), "# TODO: cache the romance\nprint('api')\n");
  git(["add", "."]);
  git(["commit", "-m", "refactor server cache date night"]);
  return tmpRepo;
}

afterEach(() => {
  if (tmpRepo) rmSync(tmpRepo, { recursive: true, force: true });
  tmpRepo = "";
});

describe("api", () => {
  it("analyzes a local repo and generates fallback fantasy", async () => {
    const repoPath = makeRepo();
    const app = createApp();

    const analysisResponse = await request(app).post("/api/analyze").send({ repoPath, commitLimit: 20 }).expect(200);

    expect(analysisResponse.body.authorCount).toBe(2);
    expect(analysisResponse.body.matches.length).toBeGreaterThan(0);

    const fantasyResponse = await request(app)
      .post("/api/fantasy")
      .send({
        analysisId: analysisResponse.body.id,
        matchId: analysisResponse.body.matches[0].id,
        mode: "regency"
      })
      .expect(200);

    expect(fantasyResponse.body.title).toContain("Ada");
    expect(fantasyResponse.body.usedOpenAI).toBe(false);
  });
});
