#!/usr/bin/env node
// Builds the cardano.nexus agent files from the single source of truth.
//
//   source:    docs/data/index.json
//   generates: docs/llms.txt, docs/llms-full.txt (and refreshes "stats" in index.json)
//
// Usage (from the repo root or from docs/):
//   node docs/_scripts/build-agent-files.mjs           # validate + write
//   node docs/_scripts/build-agent-files.mjs --check   # validate + fail if files are stale (for CI)
//
// Zero dependencies. Hand-authored files (SKILL.md, _well-known/agent.json) are only
// checked for the version/updated values they share with index.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const p = (...parts) => join(DOCS, ...parts);

const errors = [];
const fail = (msg) => errors.push(msg);

// ---------- load ----------
const indexPath = p('data', 'index.json');
const data = JSON.parse(readFileSync(indexPath, 'utf8'));

// ---------- validate ----------
for (const k of ['name', 'title', 'description', 'version', 'updated', 'status', 'homepage', 'endpoints', 'pages', 'sections']) {
  if (data[k] === undefined) fail(`index.json: missing top-level "${k}"`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated || '')) fail('index.json: "updated" must be YYYY-MM-DD');
if (!/^\d+\.\d+\.\d+$/.test(data.version || '')) fail('index.json: "version" must be semver x.y.z');

const isUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
const pageIds = new Set();
for (const pg of data.pages || []) {
  if (pageIds.has(pg.id)) fail(`duplicate page id "${pg.id}"`);
  pageIds.add(pg.id);
  if (!isUrl(pg.url)) fail(`page "${pg.id}": url must be https`);
}
const sectionIds = new Set();
let itemCount = 0;
for (const s of data.sections || []) {
  if (!s.id || !s.title || !s.summary) fail(`section ${JSON.stringify(s.id)}: needs id, title, summary`);
  if (sectionIds.has(s.id)) fail(`duplicate section id "${s.id}"`);
  sectionIds.add(s.id);
  if (!pageIds.has(s.page)) fail(`section "${s.id}": unknown page "${s.page}"`);
  if (!isUrl(s.url)) fail(`section "${s.id}": url must be https`);
  for (const g of s.groups || []) {
    if (!Array.isArray(g.items) || g.items.length === 0) fail(`section "${s.id}": every group needs items`);
    for (const it of g.items || []) {
      itemCount++;
      if (!it.name) fail(`section "${s.id}": item without a name`);
      if (it.url && !isUrl(it.url)) fail(`section "${s.id}" item "${it.name}": url must be https`);
      for (const l of it.links || []) if (!isUrl(l.url)) fail(`section "${s.id}" item "${it.name}": link url must be https`);
    }
  }
}
for (const [k, u] of Object.entries(data.endpoints || {})) if (!isUrl(u)) fail(`endpoints.${k} must be https`);

// Hand-authored files must agree with index.json on version/updated.
const cardPath = p('_well-known', 'agent.json');
if (existsSync(cardPath)) {
  const card = JSON.parse(readFileSync(cardPath, 'utf8'));
  if (card.version !== data.version) fail(`_well-known/agent.json version ${card.version} ≠ index.json ${data.version}`);
}
const skillPath = p('SKILL.md');
if (existsSync(skillPath)) {
  const skill = readFileSync(skillPath, 'utf8');
  if (!skill.includes(`updated: ${data.updated}`)) fail(`SKILL.md frontmatter "updated" ≠ index.json ${data.updated}`);
}

if (errors.length) {
  console.error('✗ agent files: validation failed\n  - ' + errors.join('\n  - '));
  process.exit(1);
}

// ---------- stats ----------
data.stats = { pages: data.pages.length, sections: data.sections.length, items: itemCount };

// ---------- render helpers ----------
const ep = data.endpoints;
const pageById = Object.fromEntries(data.pages.map((pg) => [pg.id, pg]));
const sectionsFor = (pageId) => data.sections.filter((s) => s.page === pageId);
const ada = (n) => '₳' + n.toLocaleString('en-AU');

function itemLine(it) {
  let line = `- ${it.name}`;
  const bits = [];
  if (it.value) bits.push(it.value);
  if (it.role) bits.push(`role: ${it.role}`);
  if (it.essence) bits.push(it.essence);
  if (it.mode) bits.push(`4Cs mode: ${it.mode}`);
  if (it.status) bits.push(`status: ${it.status}`);
  if (it.months) bits.push(`months ${it.months}`);
  if (typeof it.amount_ada === 'number') bits.push(ada(it.amount_ada));
  if (it.share) bits.push(it.share);
  if (it.dreps) bits.push(`DReps: ${it.dreps}`, `SPOs: ${it.spos}`, `Constitutional Committee: ${it.constitutional_committee}`);
  if (bits.length) line += ` (${bits.join(' · ')})`;
  if (it.desc) line += ` — ${it.desc}`;
  const out = [line];
  for (const c of it.covers || []) out.push(`  - ${c}`);
  if (it.acceptance) out.push(`  - Acceptance: ${it.acceptance}`);
  if (it.example) out.push(`  - Example: "${it.example}"`);
  if (it.tags?.length) out.push(`  - Tags: ${it.tags.join(', ')}`);
  if (it.url) out.push(`  - ${it.url}`);
  for (const l of it.links || []) out.push(`  - ${l.label}: ${l.url}`);
  return out.join('\n');
}

const endpointLines = [
  `- [llms.txt](${ep.llms}): this short map`,
  `- [llms-full.txt](${ep.llms_full}): all content in one plain-text file`,
  `- [data/index.json](${ep.index}): structured source of truth (schema: ${ep.schema})`,
  `- [.well-known/agent.json](${ep.agent_card}): A2A AgentCard`,
  `- [SKILL.md](${ep.skill}): agent skill — how to use and answer from these files`,
];

const header = [
  `# ${data.name}`,
  '',
  `> ${data.description}`,
  '',
  `Status: ${data.status_note}`,
  '',
  `Version ${data.version} · updated ${data.updated}`,
];

const guidance = ['## Guidance for agents', '', ...data.agent_guidance.map((g) => `- ${g}`)];
const related = ['## Related', '', ...(data.related || []).map((r) => `- [${r.name}](${r.url}): ${r.desc}`)];
const attribution = data.attribution
  ? [
      '## Attribution',
      '',
      `- Supported by the [${data.attribution.supported_by.name}](${data.attribution.supported_by.url})`,
      `- Initiated and facilitated by ${data.attribution.initiated_by.name} — ${data.attribution.initiated_by.desc} ([octonomous](${data.attribution.initiated_by.url}))`,
      `- Powered by [${data.attribution.powered_by.name}](${data.attribution.powered_by.url})`,
    ]
  : [];

// ---------- llms.txt (short map) ----------
const llms = [
  ...header,
  '',
  '## Machine-readable',
  '',
  ...endpointLines,
  '',
  '## Pages',
  '',
  ...data.pages.map((pg) => `- [${pg.title}](${pg.url}): ${pg.summary}`),
  '',
  ...data.pages.flatMap((pg) => [
    `## ${pageById[pg.id].title.split(' — ')[0]} — sections`,
    '',
    ...sectionsFor(pg.id).map((s) => `- [${s.title}](${s.url})`),
    '',
  ]),
  ...guidance,
  '',
  ...related,
  '',
].join('\n');

// ---------- llms-full.txt (everything) ----------
const full = [
  ...header,
  '',
  ...endpointLines,
  '',
  ...guidance,
  '',
  ...data.pages.flatMap((pg) => [
    '---',
    '',
    `# ${pg.title}`,
    '',
    `URL: ${pg.url}`,
    '',
    pg.summary,
    '',
    ...sectionsFor(pg.id).flatMap((s) => [
      `## ${s.title}`,
      '',
      `URL: ${s.url}`,
      '',
      s.summary,
      '',
      ...(s.groups || []).flatMap((g) => [...(g.title ? [`### ${g.title}`, ''] : []), ...g.items.map(itemLine), '']),
    ]),
  ]),
  '---',
  '',
  ...related,
  '',
  ...attribution,
  '',
].join('\n');

const indexOut = JSON.stringify(data, null, 2) + '\n';

// ---------- write / check ----------
const outputs = [
  [indexPath, indexOut],
  [p('llms.txt'), llms],
  [p('llms-full.txt'), full],
];
if (CHECK) {
  const stale = outputs.filter(([f, c]) => !existsSync(f) || readFileSync(f, 'utf8') !== c).map(([f]) => f.replace(DOCS + '/', ''));
  if (stale.length) {
    console.error(`✗ agent files out of date: ${stale.join(', ')}\n  run: node docs/_scripts/build-agent-files.mjs`);
    process.exit(1);
  }
  console.log('✓ agent files up to date');
} else {
  for (const [f, c] of outputs) writeFileSync(f, c);
  console.log(`✓ wrote llms.txt, llms-full.txt, data/index.json — ${data.stats.pages} pages, ${data.stats.sections} sections, ${data.stats.items} items`);
}
