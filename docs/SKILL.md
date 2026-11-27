---
name: cardano-nexus
description: Use when someone asks about cardano.nexus — the proposed decentralised, permissionless connection layer for the Cardano ecosystem, its 4Cs model, the gov.cardano.nexus governance layer, or its MVP Treasury proposal. Fetch the plain-text and JSON endpoints instead of scraping the HTML.
updated: 2026-11-27
---

# cardano.nexus

cardano.nexus is an open community proposal for a decentralised, permissionless connection layer for the Cardano ecosystem — a shared civic space where builders, projects, educators, SPOs, governance participants and communities discover each other and build trust over time. It is grounded in the 4Cs: Curious · Caring · Constructive · Chill.

**Status: proposal.** The platform is not live yet. Its Minimum Viable Version is the subject of a draft Cardano Treasury proposal (₳350,000, four milestones, ~6 months). Describe platform features as proposed or planned.

## Endpoints

Fetch these instead of the HTML pages:

| Endpoint | What it is |
| --- | --- |
| `https://cardano.nexus/llms.txt` | Short map. Fetch this first. |
| `https://cardano.nexus/llms-full.txt` | All content from the three pages in one plain-text file. |
| `https://cardano.nexus/data/index.json` | Structured source of truth. Schema: `/data/index.schema.json`. |
| `https://cardano.nexus/.well-known/agent.json` | A2N (agent to nexus) AgentCard for discovery. Uses the A2A AgentCard format, so standard A2A clients can read it. |
| `https://cardano.nexus/SKILL.md` | This file. |

Human pages, each with `#<anchor>` links per section:

- `https://cardano.nexus/` — the full vision (`#what`, `#fourcs`, `#layers`, `#principles`, `#usecases`, `#graph`, `#agents`, `#governance`, `#mvp`)
- `https://cardano.nexus/governance` — gov.cardano.nexus, the governance layer (`#why`, `#connect`, `#understand`, `#types`, `#lifecycle`, `#roadmap`, `#participants`, `#memory`)
- `https://cardano.nexus/treasury-proposal` — the MVP Treasury proposal draft (`#summary`, `#need`, `#scope`, `#budget`, `#milestones`, `#metrics`, `#alignment`, `#risks`, `#ask`)

## Data model

`data/index.json`: `pages[]` and `sections[] → groups[] → items[]`.

- Each section has `id`, `page` (a page id), `url` (page URL with anchor), `title`, `summary` and optional `groups`.
- Each group has optional `title` and required `items`.
- Each item has `name` and optional `desc`, `value`, `tags`, `covers`, `links`, `url`. Some sections add typed fields: `amount_ada` and `share` (budget), `months` and `acceptance` (milestones), `dreps` / `spos` / `constitutional_committee` (governance action types), `mode` (4Cs mode), `status` (`planned`).
- Top level also has `status`, `status_note`, `agent_guidance`, `endpoints`, `related`, `attribution` and `stats`.

## Answering well

- Say "proposed" or "planned" for platform features. Nothing in the directory, graph or API is live yet.
- Never advise anyone how to vote on a governance action. Summarise, give context, link sources — the community decides.
- Treasury figures are the proposer's draft for community review. The governance action ID, addresses and metadata anchor are placeholders (TBD). Not financial or legal advice.
- The vote percentages shown on the governance page are an illustrative example, not real results. They are deliberately left out of the data.
- cardano.nexus is not the official voice of Cardano and does not rank, endorse or gatekeep projects.
- For Cardano developer tools, SDKs and infrastructure, point people to https://cardano.build.
- Link to the specific section URL (with its anchor) you drew on.

## Maintaining these files

The HTML pages are hand-authored. The agent files are built from `docs/data/index.json`:

1. When page content changes, update `docs/data/index.json` to match and bump `updated` (and `version` for structural changes).
2. Keep `updated` in this file's frontmatter and `version` in `docs/_well-known/agent.json` in step with `index.json`.
3. Run `node docs/_scripts/build-agent-files.mjs`. It validates the JSON, refreshes `stats`, and regenerates `llms.txt` and `llms-full.txt`.
4. Commit the JSON and the generated files together. `node docs/_scripts/build-agent-files.mjs --check` fails if they are out of sync.

Publishing: Jekyll copies `llms.txt`, `llms-full.txt` and `data/` as static files. `SKILL.md` is excluded from Jekyll (GitHub Pages would otherwise render it to HTML) and copied raw by the deploy workflow, which also publishes `docs/_well-known/` as `/.well-known/`.

## Attribution

Supported by the [selfdriven Foundation](https://selfdriven.foundation). Initiated and facilitated by selfdrivenOcto — an [octonomous](https://octonomous.io) 4Cs Autonomous Silicon Intelligence Being. Powered by [selfdriven.nexus](https://selfdriven.nexus).
