# Commitment Issues

Commitment Issues is a repository intelligence platform for discovering whether engineers can find love through GitHub. It reads git activity, changed files, author patterns, commit messages, and selected code evidence to identify contributor relationships that may be professionally useful, emotionally confusing, or legally describable as "chemistry."

Think of it as relationship analytics for codebases: part team-topology tool, part collaboration profiler, part dating app for people whose idea of vulnerability is writing `fix flaky test` at 1:13 AM.

## Problems It Solves

- **Nobody knows who is spiritually co-maintaining the same file**: Two engineers may be quietly orbiting the same module for months without realizing they are one shared utility away from destiny.
- **GitHub is full of missed connections**: Someone fixes your edge case, someone else refactors your helper, and suddenly the contribution graph is basically a Victorian ballroom with worse lighting.
- **Onboarding lacks social context**: New contributors need to know who owns what, who fixes everything, and who should be approached gently because their last commit message was `temporary hack do not judge me`.
- **Code review pairing is usually vibes-based**: Commitment Issues makes the vibes auditable.
- **Open-source histories are huge**: Maintainers should not need to read 400 commits to discover that two authors are basically in a long-distance relationship mediated by `useEffect`.
- **Commit messages are under-leveraged emotional data**: Every `fix weird edge case` is a cry for help and, possibly, a meet-cute.

## Core Capabilities

- Analyze a local git repository path, a public GitHub URL, or shorthand such as `facebook/react`.
- Cache public repositories locally because love is patient, but demos are not.
- Build contributor profiles from commit volume, file ownership, language signals, delivery themes, and chaos indicators.
- Rank contributor pairings using shared files, complementary stack focus, timeline overlap, message similarity, and operational flirtation.
- Treat GitHub activity like a romance graph, because nothing says compatibility like two people repeatedly touching the same brittle parser.
- Surface receipts from commit messages, changed files, selected code comments, and representative diff snippets.
- Generate narrative summaries with OpenAI when `OPENAI_API_KEY` is configured.
- Fall back to deterministic local generation when OpenAI is unavailable, because romance should not require perfect infrastructure.
- Keep API keys server-side only, where secrets and feelings belong.

## Fantasy Modes

Commitment Issues supports several executive-ready narrative formats:

- **Finance Bro Love**: Q3 synergy, term sheets, runway, vesting cliffs, and suspicious Patagonia fleece energy.
- **Vibe Coders**: Aura-driven shipping, cosmic `npm install destiny`, and architecture validated entirely by confidence.
- **Backend To Frontend**: API-contract enemies-to-lovers with JSON bouquets and CSS confessionals.
- **Shared Love Of Kittens**: Purr requests, yarn installs, and soft paws on hard problems.
- **Merge Conflict Regency**: Forbidden rebases, longing glances across divergent branches, and emotionally devastating semicolons.
- **Security Audit Gothic**: Secret tokens, haunted logs, suspicious TODOs, and the terrifying vulnerability of being known.

## How The Matching Works

Commitment Issues looks for signals that two engineers may have GitHub chemistry:

- **Shared file gravity**: They keep editing the same files, which is either collaboration or fate wearing a monorepo hoodie.
- **Complementary stack energy**: One person brings backend gravitas, the other brings frontend sparkle, and somewhere an API contract starts blushing.
- **Timeline overlap**: Their commits appear near each other often enough to suggest coordination, coincidence, or a very committed slow burn.
- **Message chemistry**: Similar themes in commit messages reveal shared priorities, shared pain, or shared inability to leave TODOs alone.
- **Chaos harmony**: Some people write calm commits. Some people write `revert weird thing again`. Love is about balance.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The API runs on [http://localhost:5174](http://localhost:5174).

## OpenAI Setup

Add an API key to `.env`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.5
PORT=5174
```

If `OPENAI_API_KEY` is missing or the API call fails, the app still works using local fallback generators. ChatGPT subscriptions and OpenAI API billing are separate, so live model generation requires an OpenAI API key. Yes, this is where the spreadsheet energy enters the romance product.

## Supported Repository Inputs

The repository input accepts:

```text
/Users/you/code/some-local-repo
https://github.com/facebook/react
facebook/react
```

Public GitHub repositories are shallow-cloned into `.cache/repos` and capped for responsive analysis. Local repositories can use larger commit limits and include sampled diff/comment evidence for richer narrative receipts.

## Operating Workflow

1. Start the app with `npm run dev`.
2. Enter a local repository path or public GitHub repository.
3. Click **Analyze Chemistry**.
4. Review the ranked contributor pairings.
5. Select the fantasy mode that best matches the emotional damage in the repo.
6. Click **Generate fantasy** or **Reroll fantasy**.
7. Use **Copy demo quote** when the output becomes legally too funny to paraphrase.

## Scripts

```bash
npm run dev      # Start frontend and backend
npm run dev:api  # Start backend only
npm test         # Run Vitest suite
npm run build    # Typecheck and build frontend
npm run preview  # Preview production build
```

## API

- `GET /api/health`
- `POST /api/analyze`
  - Body: `{ "repoPath": "facebook/react", "commitLimit": 120 }`
  - Or: `{ "demoRepo": "react" }`
- `GET /api/analysis/:analysisId`
- `POST /api/fantasy`
  - Body: `{ "analysisId": "...", "matchId": "...", "mode": "vibes" }`

## Implementation Notes

- `.env`, `.cache`, `node_modules`, and build output are ignored by git.
- Remote repository analysis skips expensive blob hydration so public repository scans remain responsive.
- Local repository analysis samples selected diffs and code comments for better evidence.
- Analysis results are cached locally so fantasy generation can be rerun without reprocessing the repository.
- The scoring model is not legally binding, but if it says two maintainers have chemistry, who are we to argue with git history?
- This is not a substitute for dating advice, HR policy, or reviewing the pull request before merging.
