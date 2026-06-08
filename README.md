# Commitment Issues

Commitment Issues is a hackathon app that analyzes a git repo and finds romantic compatibility between commit authors. It reads commit history, messages, changed files, and selected diff/comment evidence, then ranks potential love matches and generates ridiculous PG-13 fantasies in different genres.

It is very unserious. The git analysis is real.

## Features

- Analyze a local git repo path, a public GitHub URL, or shorthand like `facebook/react`.
- One-click React demo repo support.
- Rank author pairs by shared files, complementary frontend/backend energy, timeline overlap, message chemistry, and chaos harmony.
- Generate fantasy writeups with commit-message receipts and code-comment evidence.
- Use OpenAI when `OPENAI_API_KEY` is configured, with a deterministic fallback comedy engine when it is not.
- Keep API keys server-side only.

## Fantasy Modes

- **Finance Bro Love**: Q3 synergy, term sheets, runway, vesting cliffs, suspicious Patagonia fleece energy.
- **Vibe Coders**: aura-driven shipping and cosmic `npm install destiny`.
- **Backend To Frontend**: API-contract enemies-to-lovers with JSON bouquets.
- **Shared Love Of Kittens**: purr requests, yarn installs, and soft paws on hard problems.
- **Merge Conflict Regency**: forbidden rebases and emotionally devastating semicolons.
- **Security Audit Gothic**: secret tokens, haunted logs, and romance discovered in a suspicious TODO.

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

If `OPENAI_API_KEY` is missing or the API call fails, the app still works using local fallback generators. ChatGPT subscriptions and OpenAI API billing are separate, so the app expects an API key for live model generation.

## Using A Repo

The repo input accepts:

```text
/Users/you/code/some-local-repo
https://github.com/facebook/react
facebook/react
```

Public GitHub repos are shallow-cloned into `.cache/repos` and capped for fast demos. Local repos can use larger commit limits and include sampled diff/comment evidence.

## Demo Script

1. Start the app with `npm run dev`.
2. Leave the default `facebook/react` input or paste another public repo.
3. Click **Analyze Chemistry**.
4. Pick a top match from the left column.
5. Switch fantasy modes until the room laughs.
6. Click **Generate fantasy** or **Reroll fantasy**.
7. Use **Copy demo quote** for sharing the best result.

## Scripts

```bash
npm run dev      # Start frontend and backend
npm run dev:api  # Start backend only
npm test         # Run Vitest suite
npm run build    # Typecheck and build frontend
npm run preview  # Preview production build
```

## API

- `POST /api/analyze`
  - Body: `{ "repoPath": "facebook/react", "commitLimit": 120 }`
  - Or: `{ "demoRepo": "react" }`
- `GET /api/analysis/:analysisId`
- `POST /api/fantasy`
  - Body: `{ "analysisId": "...", "matchId": "...", "mode": "vibes" }`

## Notes

- `.env`, `.cache`, `node_modules`, and build output are ignored by git.
- Remote repo analysis skips expensive blob hydration so demos stay quick.
- Local repo analysis samples selected diffs and code comments for funnier receipts.
