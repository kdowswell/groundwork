/**
 * Visuals derived from an artifact's template sections (ADR-009).
 *
 * The chain skills' Output Formats fix section names and table columns, so the
 * renderer can draw from them without the agent authoring anything. Each
 * visual is optional: a missing or unrecognizable section draws nothing, and
 * the section's text always stays on the page beneath it.
 *
 * Visuals are HTML/CSS (grids, chips) rather than script. Every label comes
 * from artifact text and is escaped; nothing from the artifact becomes markup
 * or an attribute other than an escaped title.
 */
import { escapeHtml, parseTable, slugify } from "./markdown.mjs";

const MAX_MAP_COMPONENTS = 14;
const LABEL_MAX = 32;

/** Lines of the `## <name>` section (exclusive of the heading), or null. */
export function sectionLines(lines, name) {
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${name}\\s*$`, "i").test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !/^##?\s/.test(lines[end])) end++;
  return lines.slice(start + 1, end);
}

/** The first table in a `## <name>` section, or null. */
export function sectionTable(lines, name) {
  const body = sectionLines(lines, name);
  if (!body) return null;
  for (let i = 0; i < body.length; i++) {
    if (body[i].includes("|") && /^\s*\|?\s*:?-{2,}/.test(body[i + 1] ?? "")) return parseTable(body, i);
  }
  return null;
}

/** Index of the first header matching `pattern`, or `fallback`. */
export function column(table, pattern, fallback) {
  const i = table.header.findIndex((h) => pattern.test(h));
  return i === -1 ? fallback : i;
}

/** Markdown inline syntax stripped to plain text (still unescaped). */
export function plain(text) {
  return String(text ?? "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/(^|\W)[*_]([^*_]+)[*_](?=\W|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text, max = LABEL_MAX) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** "Device, native module per platform (iOS)" → "Device". */
function laneLabel(where) {
  const head = plain(where).split(/[,;(]| [-—–] /)[0].trim();
  return head ? clip(head.charAt(0).toUpperCase() + head.slice(1), 24) : "";
}

/**
 * Names a data-flow step may use for a component: the full name, the part
 * before "&"/"and"/"(", kept only when long enough and unique to it.
 */
function componentAliases(components) {
  const candidates = components.map((c) => {
    const lower = c.name.toLowerCase();
    const set = new Set([lower]);
    for (const cut of [/\s*\(.*$/, /\s+(&|and)\s+.*$/]) {
      const short = lower.replace(cut, "").trim();
      if (short.length >= 4) set.add(short);
    }
    return [...set];
  });
  const counts = new Map();
  for (const list of candidates) for (const a of list) counts.set(a, (counts.get(a) ?? 0) + 1);
  return candidates.map((list) => list.filter((a, i) => i === 0 || counts.get(a) === 1));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Top-level ordered list items in a section, with continuation lines folded in. */
function orderedItems(body) {
  const items = [];
  for (const line of body) {
    const m = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (m) items.push({ n: Number(m[1]), text: m[2] });
    else if (items.length > 0 && line.trim() !== "" && !/^#/.test(line)) {
      items[items.length - 1].text += ` ${line.trim()}`;
    }
  }
  return items;
}

/** A step's short title: its bold lead-in, else its first clause. */
function stepTitle(text) {
  const bold = text.match(/^\s*\*\*([^*]+)\*\*/);
  const raw = bold ? bold[1] : plain(text).split(/(?<=[.:;])\s/)[0];
  return plain(raw).replace(/[.:]\s*$/, "");
}

// ---------------------------------------------------------------------------
// Architecture

function systemMap(lines) {
  const table = sectionTable(lines, "Components");
  if (!table) return "";
  const nameCol = column(table, /component/i, 0);
  const laneCol = column(table, /runs on|where|location|tier|deploy/i, -1);
  const stateCol = column(table, /^state/i, -1);
  const respCol = column(table, /responsib/i, -1);
  const components = table.rows
    .map((r) => ({
      name: plain(r[nameCol]),
      lane: laneCol === -1 ? "" : laneLabel(r[laneCol]),
      stateful: stateCol !== -1 && /stateful/i.test(r[stateCol] ?? "") && !/stateless/i.test(r[stateCol] ?? ""),
      responsibility: respCol === -1 ? "" : plain(r[respCol]),
    }))
    .filter((c) => c.name && !/^\.{3}$/.test(c.name));
  if (components.length < 2 || components.length > MAX_MAP_COMPONENTS) return "";

  // Group into lanes, in order of first appearance.
  const laneOrder = [];
  for (const c of components) if (!laneOrder.includes(c.lane)) laneOrder.push(c.lane);
  const ordered = laneOrder.flatMap((lane) => components.filter((c) => c.lane === lane));
  const aliases = componentAliases(ordered);

  const flowBody = sectionLines(lines, "Primary Data Flow") ?? [];
  const steps = orderedItems(flowBody).map((item) => {
    const text = plain(item.text).toLowerCase();
    const hits = [];
    ordered.forEach((_, i) => {
      if (aliases[i].some((a) => new RegExp(`(^|[^a-z0-9])${escapeRe(a)}([^a-z0-9]|$)`).test(text))) hits.push(i);
    });
    const title = stepTitle(item.text);
    // The lanes already say where a step runs; keep "(device, no network)" for the tooltip.
    return { n: item.n, title, short: title.replace(/\s*\([^)]*\)\s*$/, "") || title, hits };
  });

  const cols = ordered.length;
  const rows = steps.length;
  const style = `grid-template-columns:minmax(130px,1.3fr) repeat(${cols},minmax(76px,1fr));grid-template-rows:auto auto${rows ? ` repeat(${rows},minmax(40px,auto))` : ""}`;
  const parts = [];
  let col = 2;
  laneOrder.forEach((lane, li) => {
    const span = ordered.filter((c) => c.lane === lane).length;
    parts.push(`<div class="band${li % 2 ? " alt" : ""}" style="grid-column:${col} / span ${span};grid-row:1 / -1"></div>`);
    if (laneCol !== -1) {
      parts.push(`<div class="lane" style="grid-column:${col} / span ${span};grid-row:1">${escapeHtml(lane || "Unspecified")}</div>`);
    }
    col += span;
  });
  ordered.forEach((c, i) => {
    const badge = c.stateful ? `<span class="tag">stateful</span>` : "";
    const title = c.responsibility ? ` title="${escapeHtml(c.responsibility)}"` : "";
    parts.push(
      `<div class="comp" style="grid-column:${i + 2};grid-row:2"${title}><span>${escapeHtml(c.name)}</span>${badge}</div>`,
    );
  });
  steps.forEach((s, si) => {
    const row = si + 3;
    parts.push(
      `<div class="step" style="grid-row:${row}" title="${escapeHtml(s.title)}"><b>${s.n}</b><span>${escapeHtml(s.short)}</span></div>`,
    );
    if (s.hits.length > 1) {
      const a = s.hits[0];
      const b = s.hits[s.hits.length - 1];
      const span = b - a + 1;
      parts.push(
        `<div class="wire" style="grid-column:${a + 2} / span ${span};grid-row:${row};margin-inline:calc(50% / ${span})"></div>`,
      );
    }
    for (const h of s.hits) parts.push(`<div class="dot" style="grid-column:${h + 2};grid-row:${row}"></div>`);
    if (s.hits.length === 0) {
      parts.push(`<div class="none" style="grid-column:2 / span ${cols};grid-row:${row}">names no component</div>`);
    }
  });

  const caption =
    rows > 0
      ? "Components by where they run, and the components each Primary Data Flow step names"
      : "Components by where they run";
  return `<figure class="viz sysmap"><figcaption>${caption}</figcaption><div class="scroll"><div class="grid" style="${style}">${parts.join("")}</div></div>${
    laneCol === -1
      ? `<p class="small">Add a <code>Runs on</code> column to Components to group them into lanes.</p>`
      : ""
  }</figure>`;
}

const SEVERITY_GROUPS = [
  { key: "catastrophic", label: "Catastrophic", cls: "sev-bad" },
  { key: "partly", label: "Catastrophic in part", cls: "sev-warn" },
  { key: "degraded", label: "Degraded", cls: "sev-ok" },
  { key: "other", label: "Unclassified", cls: "" },
];

function dependencies(lines) {
  const table = sectionTable(lines, "External Dependencies");
  if (!table) return "";
  const nameCol = column(table, /dependenc/i, 0);
  const needCol = column(table, /need/i, -1);
  const sevCol = column(table, /severity/i, -1);
  if (sevCol === -1) return "";
  const groups = new Map(SEVERITY_GROUPS.map((g) => [g.key, []]));
  for (const r of table.rows) {
    const name = plain(r[nameCol]);
    if (!name || /^\.{3}$/.test(name)) continue;
    const sev = plain(r[sevCol]).toLowerCase();
    const key = /^catastrophic/.test(sev)
      ? "catastrophic"
      : /catastrophic/.test(sev)
        ? "partly"
        : /degraded/.test(sev)
          ? "degraded"
          : "other";
    // For a mixed severity, say when it is catastrophic: "catastrophic for new sign-ups".
    const when = key === "partly" ? (plain(r[sevCol]).match(/catastrophic[^.;]*/i)?.[0] ?? "") : "";
    groups.get(key).push({ name, need: needCol === -1 ? "" : plain(r[needCol]), sev: plain(r[sevCol]), when });
  }
  const cols = SEVERITY_GROUPS.filter((g) => groups.get(g.key).length > 0).map(
    (g) =>
      `<section class="sev ${g.cls}"><h4>${g.label} <span>${groups.get(g.key).length}</span></h4><ul>${groups
        .get(g.key)
        .map(
          (d) =>
            `<li title="${escapeHtml(d.sev)}"><strong>${escapeHtml(d.name)}</strong>${d.need ? `<span>${escapeHtml(d.need)}</span>` : ""}${d.when ? `<em>${escapeHtml(d.when)}</em>` : ""}</li>`,
        )
        .join("")}</ul></section>`,
  );
  if (cols.length === 0) return "";
  return `<figure class="viz deps"><figcaption>External dependencies by severity if down for 30 minutes</figcaption><div class="sev-cols">${cols.join("")}</div></figure>`;
}

/** Split inline prose into items at top-level commas and semicolons. */
function splitInline(text) {
  const items = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) {
      items.push(cur);
      cur = "";
    } else cur += ch;
  }
  items.push(cur);
  return items.map((s) => s.trim().replace(/^and\s+/i, "").replace(/\.$/, "")).filter(Boolean);
}

function syncAsync(lines) {
  const body = sectionLines(lines, "Sync / Async Boundary") ?? sectionLines(lines, "Sync/Async Boundary");
  if (!body) return "";
  const groups = [];
  for (const line of body) {
    const label = line.match(/^\s*\*\*([^*]+?):?\*\*:?\s*(.*)$/);
    if (label) {
      groups.push({ label: plain(label[1]).replace(/:$/, ""), inline: label[2], items: [] });
    } else if (groups.length > 0) {
      const g = groups[groups.length - 1];
      const item = line.match(/^\s*[-*+]\s+(.*)$/);
      if (item) g.items.push(plain(item[1]).replace(/\.$/, ""));
      else if (line.trim() !== "") g.inline += ` ${line.trim()}`;
    }
  }
  for (const g of groups) {
    if (g.items.length === 0 && g.inline.trim()) g.items = splitInline(plain(g.inline));
  }
  const kinds = groups
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, async: /async|background/i.test(g.label) }));
  if (!kinds.some((g) => g.async) || !kinds.some((g) => !g.async)) return "";
  // "Synchronous (the user waits; needs network)" → "needs network": the column already says the rest.
  const qualifier = (label) =>
    (label.match(/\(([^)]*)\)\s*$/)?.[1] ?? "")
      .split(/;\s*/)
      .filter((part) => part && !/user waits|background/i.test(part))
      .join("; ");
  const firstSentence = (item) => item.split(/(?<=\.)\s+(?=[A-Z])/)[0].replace(/\.$/, "");
  const column = (async) =>
    `<section class="lane-col ${async ? "async" : "sync"}"><h4>${async ? "In the background" : "The user waits"}</h4>${kinds
      .filter((g) => g.async === async)
      .map(
        (g) =>
          `<div class="group">${qualifier(g.label) ? `<div class="small">${escapeHtml(qualifier(g.label))}</div>` : ""}<ul class="chips">${g.items
            .map((i) => `<li title="${escapeHtml(i)}">${escapeHtml(clip(firstSentence(i), 90))}</li>`)
            .join("")}</ul></div>`,
      )
      .join("")}</section>`;
  return `<figure class="viz syncasync"><figcaption>What the user waits for, and what happens in the background</figcaption><div class="two">${column(false)}${column(true)}</div></figure>`;
}

// ---------------------------------------------------------------------------
// Spec, and the builder check shared by all three artifacts

/** Top-level list items (bullets or numbers) with continuation lines folded in. */
function listItems(body) {
  const items = [];
  for (const line of body) {
    const m = line.match(/^([-*+]|\d+[.)])\s+(.*)$/);
    if (m) items.push(m[2]);
    else if (items.length > 0 && /^\s+\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`;
    else if (items.length > 0 && line.trim() !== "") break;
  }
  return items;
}

/** Lines under the first `### ` heading matching `pattern` inside a section body. */
function subsection(body, pattern) {
  const start = body.findIndex((l) => /^###\s/.test(l) && pattern.test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < body.length && !/^###\s/.test(body[end])) end++;
  return { heading: plain(body[start].replace(/^###\s+/, "")), lines: body.slice(start + 1, end) };
}

/** An item's short title: its bold lead-in, else its first sentence. */
function itemTitle(text) {
  const bold = text.match(/^\s*\*\*([^*]+)\*\*/);
  const raw = bold ? bold[1] : plain(text).split(/(?<=\.)\s+(?=[A-Z])/)[0];
  return clip(plain(raw).replace(/\.$/, ""), 110);
}

function scopeColumns(lines) {
  const body = sectionLines(lines, "Scope");
  if (!body) return "";
  const inScope = subsection(body, /in scope/i);
  const out = subsection(body, /non-goal|out of scope/i);
  if (!inScope || !out) return "";
  const col = (sub, cls, label) => {
    const items = listItems(sub.lines);
    const tag = cls === "in" ? "ol" : "ul";
    const qualifier = sub.heading.match(/\(([^)]*)\)\s*$/)?.[1] ?? "";
    return `<section class="scope-col ${cls}"><h4>${label} <span>${items.length}</span></h4>${
      qualifier ? `<div class="small">${escapeHtml(qualifier)}</div>` : ""
    }<${tag}>${items.map((i) => `<li title="${escapeHtml(plain(i))}">${escapeHtml(itemTitle(i))}</li>`).join("")}</${tag}></section>`;
  };
  if (listItems(inScope.lines).length === 0 && listItems(out.lines).length === 0) return "";
  return `<figure class="viz scope"><figcaption>What this builds, and what it deliberately doesn't</figcaption><div class="two">${col(inScope, "in", "In scope")}${col(out, "out", "Not doing")}</div></figure>`;
}

/** "Blocking: owner action, needed…" → {key: "Blocking", note: "owner action, needed…"}. */
function questionCategory(raw) {
  const text = plain(raw);
  const known = text.match(/^(blocking|deferrable|deferred)\b[\s,:;.—–-]*(.*)$/i);
  if (known) {
    const key = /^block/i.test(known[1]) ? "Blocking" : "Deferrable";
    return { key, note: known[2].replace(/^\((.*)\)$/, "$1") };
  }
  const head = text.split(/[,:;(]/)[0].trim();
  return { key: clip(head || "Uncategorized", 28), note: text.slice(head.length).replace(/^[\s,:;]+/, "") };
}

function questionBoard(lines) {
  const table = sectionTable(lines, "Open Questions");
  if (!table) return "";
  const qCol = column(table, /question/i, 0);
  const catCol = column(table, /category/i, -1);
  const ownerCol = column(table, /owner/i, -1);
  const numCol = column(table, /^#$|^no\.?$/i, -1);
  if (catCol === -1) return "";
  const questions = table.rows
    .map((r) => ({
      n: numCol === -1 ? "" : plain(r[numCol]),
      text: plain(r[qCol]),
      ...questionCategory(r[catCol] ?? ""),
      owner: ownerCol === -1 ? "" : plain(r[ownerCol]),
    }))
    .filter((q) => q.text && !/^\.{3}$/.test(q.text));
  if (questions.length === 0) return "";

  const order = ["Blocking", "Deferrable"];
  const keys = [...new Set(questions.map((q) => q.key))].sort(
    (a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9),
  );
  const owners = new Map();
  for (const q of questions) if (q.owner) owners.set(q.owner, (owners.get(q.owner) ?? 0) + 1);
  const ownerLine =
    owners.size > 0
      ? `<ul class="chips owners">${[...owners]
          .sort((a, b) => b[1] - a[1])
          .map(([o, c]) => `<li>${escapeHtml(o)} <b>${c}</b></li>`)
          .join("")}</ul>`
      : "";
  const cols = keys.map((key) => {
    const qs = questions.filter((q) => q.key === key);
    const cls = key === "Blocking" ? "sev-bad" : key === "Deferrable" ? "sev-ok" : "";
    return `<section class="sev ${cls}"><h4>${escapeHtml(key)} <span>${qs.length}</span></h4><ul>${qs
      .map(
        (q) =>
          `<li>${q.n ? `<b class="qn">${escapeHtml(q.n)}</b> ` : ""}<strong>${escapeHtml(q.text)}</strong>${
            q.note ? `<span>${escapeHtml(clip(q.note, 140))}</span>` : ""
          }${q.owner ? `<i class="owner">${escapeHtml(q.owner)}</i>` : ""}</li>`,
      )
      .join("")}</ul></section>`;
  });
  return `<figure class="viz board"><figcaption>Open questions by category, with who owns the answer</figcaption>${ownerLine}<div class="sev-cols">${cols.join("")}</div></figure>`;
}

const RESOLUTIONS = [
  { key: "Answered", test: /^answered/i, cls: "r-answered" },
  { key: "Agent call", test: /^agent call/i, cls: "r-agent" },
  { key: "User", test: /^user\b/i, cls: "r-user" },
  { key: "Deferred", test: /^defer/i, cls: "r-deferred" },
];

function builderBar(lines) {
  const table = sectionTable(lines, "Builder Check");
  if (!table) return "";
  const qCol = column(table, /question/i, 0);
  const rCol = column(table, /resolution/i, qCol + 1);
  const counts = new Map();
  let total = 0;
  for (const r of table.rows) {
    const q = plain(r[qCol]);
    const res = plain(r[rCol]);
    if (!q || /^\.{3}$/.test(q) || !res) continue;
    const known = RESOLUTIONS.find((k) => k.test.test(res));
    const key = known ? known.key : clip(res.split(/[:;(,]/)[0].trim() || "Other", 24);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }
  if (total < 2) return "";
  const keys = [...counts.keys()].sort((a, b) => {
    const ia = RESOLUTIONS.findIndex((k) => k.key === a);
    const ib = RESOLUTIONS.findIndex((k) => k.key === b);
    return (ia === -1 ? 9 : ia) - (ib === -1 ? 9 : ib) || counts.get(b) - counts.get(a);
  });
  const cls = (key) => RESOLUTIONS.find((k) => k.key === key)?.cls ?? "r-other";
  const segs = keys
    .map(
      (k) =>
        `<span class="seg ${cls(k)}" style="flex:${counts.get(k)}" title="${escapeHtml(k)}: ${counts.get(k)}"></span>`,
    )
    .join("");
  const legend = keys
    .map((k) => `<li><i class="sw ${cls(k)}"></i>${escapeHtml(k)} <b>${counts.get(k)}</b></li>`)
    .join("");
  return `<figure class="viz bcheck"><figcaption>How the builder check's ${total} questions were resolved</figcaption><div class="bar">${segs}</div><ul class="legend">${legend}</ul></figure>`;
}

/** Spec summary at the top of the page: the riskiest assumption and counts that link to sections. */
function specSummary(lines) {
  const body = sectionLines(lines, "Riskiest Assumption");
  const claim = body ? plain(body.join("\n").trim().split(/\n\s*\n/)[0] ?? "") : "";
  const stats = [];
  const scope = sectionLines(lines, "Scope");
  const inScope = scope && subsection(scope, /in scope/i);
  const out = scope && subsection(scope, /non-goal|out of scope/i);
  if (inScope) stats.push(["scope", `${listItems(inScope.lines).length} in scope`]);
  if (out) stats.push(["scope", `${listItems(out.lines).length} not doing`]);
  const criteria = sectionLines(lines, "Success Criteria");
  if (criteria) stats.push(["success-criteria", `${listItems(criteria).length} success criteria`]);
  const open = sectionTable(lines, "Open Questions");
  if (open) {
    const catCol = column(open, /category/i, -1);
    const blocking = catCol === -1 ? 0 : open.rows.filter((r) => /^\W*blocking/i.test(plain(r[catCol]))).length;
    stats.push(["open-questions", `${open.rows.length} open questions${blocking ? `, ${blocking} blocking` : ""}`]);
  }
  if (!claim && stats.length === 0) return "";
  return `<figure class="viz summary">${
    claim
      ? `<a class="claim" href="#riskiest-assumption"><span>Riskiest assumption</span>${escapeHtml(clip(claim, 600))}</a>`
      : ""
  }${
    stats.length
      ? `<ul class="chips stats">${stats.map(([id, t]) => `<li><a href="#${id}">${escapeHtml(t)}</a></li>`).join("")}</ul>`
      : ""
  }</figure>`;
}

// ---------------------------------------------------------------------------
// Data model

const MAX_DIAGRAM_ENTITIES = 16;
const NODE_W = 142;
const NODE_H = 48;
const GAP_X = 20;
const MAX_PER_ROW = 4;
const GAP_Y = 64;
const OWNER_COLORS = ["var(--accent)", "var(--ok)", "var(--warn)", "var(--bad)", "var(--muted)"];

/** "one-to-many", "1:N", "has many", "N:1"… → [left, right] as "1" | "N", or null. */
function cardinality(raw) {
  const t = plain(raw).toLowerCase();
  const side = (w) => (/^(one|1|single)$/.test(w) ? "1" : /^(many|n|\*|m)$/.test(w) ? "N" : null);
  const pair = t.match(/\b(one|many|1|n|m|\*)\s*(?:-?\s*to\s*-?|:|\.\.|\/)\s*(one|many|1|n|m|\*)\b/);
  if (pair) {
    const a = side(pair[1]);
    const b = side(pair[2]);
    return a && b ? [a, b] : null;
  }
  if (/has many|contains|owns many/.test(t)) return ["1", "N"];
  if (/belongs to|many of one/.test(t)) return ["N", "1"];
  return null;
}

/**
 * Layered layout: an edge points from its "1" side to its "N" side (parent above child);
 * one-to-one and many-to-many point from the left entity to the right one. Cycles are
 * broken by depth-first back edges, layers come from the longest path, and one
 * barycenter pass orders each layer under its parents.
 */
function layoutEntities(names, edges) {
  const out = new Map(names.map((n) => [n, []]));
  for (const e of edges) if (e.from !== e.to) out.get(e.from).push(e.to);
  const state = new Map();
  const dag = new Map(names.map((n) => [n, []]));
  const visit = (n) => {
    state.set(n, 1);
    for (const m of out.get(n)) {
      if (state.get(m) === 1) continue; // back edge: drop for layering
      dag.get(n).push(m);
      if (!state.has(m)) visit(m);
    }
    state.set(n, 2);
  };
  for (const n of names) if (!state.has(n)) visit(n);

  const layer = new Map();
  const depth = (n) => {
    if (layer.has(n)) return layer.get(n);
    layer.set(n, 0); // guards re-entry; the DAG has no cycles
    let d = 0;
    for (const [p, kids] of dag) if (kids.includes(n)) d = Math.max(d, depth(p) + 1);
    layer.set(n, d);
    return d;
  };
  for (const n of names) depth(n);

  const layers = [];
  for (const n of names) (layers[layer.get(n)] ??= []).push(n);
  const pos = new Map();
  layers.forEach((row, li) => {
    if (li > 0) {
      const center = (n) => {
        const parents = [...dag].filter(([, kids]) => kids.includes(n)).map(([p]) => pos.get(p));
        return parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : Infinity;
      };
      row.sort((a, b) => center(a) - center(b));
    }
    row.forEach((n, i) => pos.set(n, i - (row.length - 1) / 2));
  });
  return { layers, layer, pos };
}

function entityDiagram(lines) {
  const entTable = sectionTable(lines, "Entities");
  const relTable = sectionTable(lines, "Relationships");
  if (!entTable || !relTable) return "";
  const nameCol = column(entTable, /entity/i, 0);
  const ownerCol = column(entTable, /owner/i, -1);
  const defCol = column(entTable, /definition|description/i, -1);
  const entities = new Map();
  for (const r of entTable.rows) {
    const name = plain(r[nameCol]);
    if (!name || /^\.{3}$/.test(name)) continue;
    entities.set(name.toLowerCase(), {
      name,
      owner: ownerCol === -1 ? "" : plain(r[ownerCol]),
      def: defCol === -1 ? "" : plain(r[defCol]),
      listed: true,
    });
  }
  const aCol = column(relTable, /entity a|^from|^source/i, 0);
  const kindCol = column(relTable, /relationship|cardinality/i, 1);
  const bCol = column(relTable, /entity b|^to$|^target/i, 2);
  const noteCol = column(relTable, /note/i, -1);
  const edges = [];
  for (const r of relTable.rows) {
    const a = plain(r[aCol]);
    const b = plain(r[bCol]);
    const card = cardinality(r[kindCol] ?? "");
    if (!a || !b || /^\.{3}$/.test(a) || !card) continue;
    for (const n of [a, b]) {
      if (!entities.has(n.toLowerCase())) entities.set(n.toLowerCase(), { name: n, owner: "", def: "", listed: false });
    }
    const A = entities.get(a.toLowerCase()).name;
    const B = entities.get(b.toLowerCase()).name;
    const flip = card[0] === "N" && card[1] === "1";
    edges.push({
      from: flip ? B : A,
      to: flip ? A : B,
      fromCard: flip ? card[1] : card[0],
      toCard: flip ? card[0] : card[1],
      label: `${A} ${plain(r[kindCol])} ${B}${noteCol !== -1 && plain(r[noteCol]) ? ` — ${plain(r[noteCol])}` : ""}`,
    });
  }
  const nodes = [...entities.values()];
  if (edges.length === 0 || nodes.length < 2 || nodes.length > MAX_DIAGRAM_ENTITIES) return "";

  const names = nodes.map((n) => n.name);
  const { layers } = layoutEntities(names, edges);
  // Wrap wide layers so the diagram fits the page instead of scrolling: rows of at most MAX_PER_ROW.
  const rows = layers.flatMap((l) =>
    Array.from({ length: Math.ceil(l.length / MAX_PER_ROW) }, (_, k) => l.slice(k * MAX_PER_ROW, (k + 1) * MAX_PER_ROW)),
  );
  const rowOf = new Map();
  const slot = new Map();
  rows.forEach((r, ri) => r.forEach((n, i) => (rowOf.set(n, ri), slot.set(n, i - (r.length - 1) / 2))));
  const widest = Math.max(...rows.map((r) => r.length));
  const width = widest * NODE_W + (widest - 1) * GAP_X + 24;
  const height = rows.length * NODE_H + (rows.length - 1) * GAP_Y + 24;
  const cx = (n) => width / 2 + slot.get(n) * (NODE_W + GAP_X);
  const top = (n) => 12 + rowOf.get(n) * (NODE_H + GAP_Y);

  // Spread each node's edges along its bottom (outgoing) and top (incoming) edge, ordered by
  // where the other end sits, so lines and their 1/N labels don't pile onto one point.
  const port = new Map();
  const spread = (key, list, other) => {
    list.sort((x, y) => cx(other(x)) - cx(other(y)));
    list.forEach((e, i) => port.set(`${key}:${edges.indexOf(e)}`, (i + 1) / (list.length + 1) - 0.5));
  };
  for (const n of names) {
    spread("out", edges.filter((e) => e.from === n), (e) => e.to);
    spread("in", edges.filter((e) => e.to === n), (e) => e.from);
  }
  const span = NODE_W * 0.7;

  const owners = [...new Set(nodes.map((n) => n.owner).filter(Boolean))];
  const color = (owner) => (owner ? OWNER_COLORS[owners.indexOf(owner) % OWNER_COLORS.length] : "var(--line)");

  const svgEdges = edges
    .map((e, ei) => {
      const x1 = cx(e.from) + port.get(`out:${ei}`) * span;
      const x2 = cx(e.to) + port.get(`in:${ei}`) * span;
      const down = rowOf.get(e.to) > rowOf.get(e.from);
      const y1 = down ? top(e.from) + NODE_H : top(e.from) + NODE_H / 2;
      const y2 = down ? top(e.to) : top(e.to) + NODE_H / 2;
      const bend = down ? Math.max(24, (y2 - y1) / 2) : 0;
      const path = down
        ? `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}`
        : `M${x1 + (x2 > x1 ? NODE_W / 2 : -NODE_W / 2)},${y1} C${x1},${y1 - GAP_Y} ${x2},${y2 - GAP_Y} ${x2 + (x2 > x1 ? -NODE_W / 2 : NODE_W / 2)},${y2}`;
      const end = down
        ? `<text class="card" x="${x1 + 4}" y="${y1 + 13}">${e.fromCard}</text><text class="card" x="${x2 + 4}" y="${y2 - 5}">${e.toCard}</text>`
        : "";
      return `<g class="edge"><title>${escapeHtml(e.label)}</title><path d="${path}"/>${end}</g>`;
    })
    .join("");
  const svgNodes = nodes
    .map((n) => {
      const x = cx(n.name) - NODE_W / 2;
      const y = top(n.name);
      const tip = [n.name, n.def, n.owner && `Owner: ${n.owner}`, !n.listed && "Named in Relationships but not in Entities"]
        .filter(Boolean)
        .join(" — ");
      return `<g class="node${n.listed ? "" : " unlisted"}"><title>${escapeHtml(tip)}</title><rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="8"/><rect class="stripe" x="${x}" y="${y}" width="5" height="${NODE_H}" rx="2" style="fill:${color(n.owner)}"/><text class="name" x="${x + 14}" y="${y + 20}">${escapeHtml(clip(n.name, 18))}</text><text class="owner" x="${x + 14}" y="${y + 37}">${escapeHtml(clip(n.owner || (n.listed ? "no owner" : "not in Entities"), 22))}</text></g>`;
    })
    .join("");
  const legend = owners.length
    ? `<ul class="legend">${owners.map((o) => `<li><i class="sw" style="background:${color(o)}"></i>${escapeHtml(o)}</li>`).join("")}</ul>`
    : "";
  return `<figure class="viz erd"><figcaption>Entities and relationships, the "one" side above the "many" side, colored by owner</figcaption><div class="scroll"><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Entity relationship diagram">${svgEdges}${svgNodes}</svg></div>${legend}</figure>`;
}

function consistencyGroups(lines) {
  const table = sectionTable(lines, "Consistency Requirements");
  if (!table) return "";
  const bCol = column(table, /boundary/i, 0);
  const reqCol = column(table, /requirement|model|consistency/i, 1);
  const whyCol = column(table, /reason|why/i, -1);
  const groups = new Map();
  for (const r of table.rows) {
    const boundary = plain(r[bCol]);
    const req = plain(r[reqCol]);
    if (!boundary || /^\.{3}$/.test(boundary) || !req) continue;
    const key = clip(req.split(/[,;:(.]/)[0].trim(), 28);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ boundary, why: whyCol === -1 ? "" : plain(r[whyCol]), req });
  }
  if (groups.size === 0) return "";
  // Strongest first: strong boundaries constrain the design most; mixed ones say "strong at X, eventual at Y".
  const STRONG = /strong|linearizable|serializable|transactional|immediate/i;
  const rank = (items) => {
    const req = items[0].req;
    return STRONG.test(req) && /eventual/i.test(req) ? 1 : STRONG.test(req) ? 0 : /eventual/i.test(req) ? 2 : 3;
  };
  const cls = (items) => ["sev-bad", "sev-warn", "sev-ok", ""][rank(items)];
  const cols = [...groups].sort((x, y) => rank(x[1]) - rank(y[1])).map(
    ([k, items]) =>
      `<section class="sev ${cls(items)}"><h4>${escapeHtml(k)} <span>${items.length}</span></h4><ul>${items
        .map((i) => `<li title="${escapeHtml(i.req)}"><strong>${escapeHtml(i.boundary)}</strong>${i.why ? `<span>${escapeHtml(clip(i.why, 140))}</span>` : ""}</li>`)
        .join("")}</ul></section>`,
  );
  return `<figure class="viz consistency"><figcaption>Consistency boundaries by requirement</figcaption><div class="sev-cols">${cols.join("")}</div></figure>`;
}

// ---------------------------------------------------------------------------
// Safe change plan (ADR-012)

/** The Behavior Delta as Added / Modified / Removed / Unchanged columns. */
function deltaColumns(lines) {
  const body = sectionLines(lines, "Behavior Delta");
  if (!body) return "";
  const group = (pattern) => subsection(body, pattern);
  const added = group(/^###\s+added/i);
  const modified = group(/^###\s+modified/i);
  const removed = group(/^###\s+removed/i);
  const unchanged = group(/^###\s+unchanged/i);
  if (!added && !modified && !removed && !unchanged) return "";

  const items = (sub) => (sub ? listItems(sub.lines).filter((i) => !/^\{\{|^\.{3}$/.test(plain(i))) : []);
  const rows = [];
  if (modified) {
    for (let i = 0; i < modified.lines.length; i++) {
      if (modified.lines[i].includes("|") && /^\s*\|?\s*:?-{2,}/.test(modified.lines[i + 1] ?? "")) {
        const t = parseTable(modified.lines, i);
        const b = column(t, /before/i, 0);
        const a = column(t, /after/i, 1);
        const ref = column(t, /reference|spec|evidence/i, -1);
        for (const r of t.rows) {
          const before = plain(r[b]);
          const after = plain(r[a]);
          if ((before || after) && !/^\.{3}$/.test(before)) rows.push({ before, after, ref: ref === -1 ? "" : plain(r[ref]) });
        }
        break;
      }
    }
    // Modified written as a list ("Before → After") instead of a table.
    if (rows.length === 0) {
      for (const i of items(modified)) {
        const [before, after] = plain(i).split(/\s*(?:→|->)\s*/);
        rows.push(after ? { before, after, ref: "" } : { before: "", after: before, ref: "" });
      }
    }
  }
  // Keep the whole item: a bold lead-in stays bold, and the explanation after it stays visible.
  const item = (i) => {
    const bold = i.match(/^\s*\*\*([^*]+)\*\*\s*(.*)$/);
    return bold
      ? `<strong>${escapeHtml(plain(bold[1]))}</strong> ${escapeHtml(clip(plain(bold[2]), 200))}`
      : escapeHtml(clip(plain(i), 200));
  };
  const list = (arr) => (arr.length ? `<ul>${arr.map((i) => `<li>${item(i)}</li>`).join("")}</ul>` : `<p class="small">None.</p>`);
  const col = (cls, label, count, html) =>
    `<section class="dcol ${cls}"><h4>${label} <span>${count}</span></h4>${html}</section>`;
  const mod = rows.length
    ? `<ul class="mods">${rows
        .map(
          (r) =>
            `<li><span class="was">${escapeHtml(r.before || "—")}</span><span class="arrow">→</span><span class="now">${escapeHtml(r.after || "—")}</span>${
              r.ref ? `<span class="ref">${escapeHtml(r.ref)}</span>` : ""
            }</li>`,
        )
        .join("")}</ul>`
    : `<p class="small">None.</p>`;
  const a = items(added);
  const rm = items(removed);
  const un = items(unchanged);
  return `<figure class="viz delta"><figcaption>What this change adds, modifies, and removes, and what must keep working</figcaption><div class="dcols">${col("d-add", "Added", a.length, list(a))}${col("d-mod", "Modified", rows.length, mod)}${col("d-rem", "Removed", rm.length, list(rm))}${col("d-keep", "Unchanged", un.length, list(un))}</div>${
    un.length === 0 ? `<p class="banner warn">No Unchanged items: nothing says which adjacent behavior must keep working.</p>` : ""
  }</figure>`;
}

const SEVERITIES = ["catastrophic", "degraded", "silent", "none"];

/** Blast radius severity as a callout. */
function blastCallout(lines) {
  const body = sectionLines(lines, "Blast Radius");
  if (!body) return "";
  const text = plain(body.join(" "));
  const m = text.match(/severity:\s*([a-z /]+?)(?=\s+affected:|\s*$|[.;])/i);
  if (!m) return "";
  const found = SEVERITIES.filter((sv) => new RegExp(`\\b${sv}\\b`, "i").test(m[1]));
  // The template's own "Catastrophic / Degraded / Silent / None" placeholder names all four.
  if (found.length === 0 || found.length === SEVERITIES.length) return "";
  const cls = found.includes("catastrophic") ? "bad" : found.includes("silent") || found.includes("degraded") ? "warn" : "ok";
  const affected = text.match(/affected:\s*(.+)$/i)?.[1] ?? "";
  return `<figure class="viz callout ${cls}"><span>Blast radius</span><strong>${escapeHtml(found.map((f) => f[0].toUpperCase() + f.slice(1)).join(", "))}</strong>${
    affected && !/^\.{3}$/.test(affected) ? `<em>${escapeHtml(clip(affected, 220))}</em>` : ""
  }</figure>`;
}

/** One-way doors in the rollback strategy, called out when there are any. */
function oneWayDoors(lines) {
  const body = sectionLines(lines, "Rollback Strategy");
  if (!body) return "";
  const line = body.find((l) => /one-way doors?:/i.test(l));
  if (!line) return "";
  const what = plain(line.replace(/^.*one-way doors?:\s*/i, ""));
  if (!what || /^(none|n\/a|-+|\{\{.*)/i.test(what)) return "";
  return `<figure class="viz callout bad"><span>One-way door</span><strong>${escapeHtml(clip(what, 300))}</strong><em>Can't be rolled back. The deployment sequence must treat it as final.</em></figure>`;
}

/**
 * Visuals for an artifact, keyed by the slug of the `##` heading they sit under.
 * The key TOP holds a summary shown at the top of the document.
 * @param {{label: string} | null} kind
 * @param {string} source
 * @returns {Map<string, string>}
 */
export const TOP = "@top";

export function deriveVisuals(kind, source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = new Map();
  const add = (heading, html) => {
    if (html) out.set(slugify(heading), html);
  };
  if (kind?.label === "Architecture sketch") {
    add("Components", systemMap(lines));
    add("External Dependencies", dependencies(lines));
    add("Sync / Async Boundary", syncAsync(lines));
  }
  if (kind?.label === "Spec") {
    const summary = specSummary(lines);
    if (summary) out.set(TOP, summary);
    add("Scope", scopeColumns(lines));
    add("Open Questions", questionBoard(lines));
  }
  if (kind?.label === "Change plan") {
    add("Behavior Delta", deltaColumns(lines));
    add("Blast Radius", blastCallout(lines));
    add("Rollback Strategy", oneWayDoors(lines));
  }
  if (kind?.label === "Data model") {
    add("Entities", entityDiagram(lines));
    add("Consistency Requirements", consistencyGroups(lines));
  }
  if (kind) add("Builder Check", builderBar(lines));
  return out;
}

export const VISUAL_CSS = `
figure.viz{margin:14px 0 18px;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
figure.viz figcaption{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.sysmap .scroll{overflow-x:auto}
.sysmap .grid{display:grid;gap:0;min-width:min-content;position:relative}
.sysmap .band{background:color-mix(in srgb,var(--accent) 5%,transparent);border-radius:8px;z-index:0}
.sysmap .band.alt{background:color-mix(in srgb,var(--accent) 11%,transparent)}
.sysmap .lane{z-index:1;text-align:center;font-size:12px;line-height:1.3;font-weight:600;color:var(--accent);padding:6px 4px 2px}
.sysmap .comp{z-index:1;margin:4px 4px 8px;padding:8px 5px;overflow-wrap:break-word;hyphens:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel);
font-size:12.5px;font-weight:600;line-height:1.3;text-align:center;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center}
.sysmap .tag{font-size:10.5px;font-weight:600;color:var(--warn);background:var(--warn-bg);border-radius:999px;padding:0 7px}
.sysmap .step{grid-column:1;z-index:3;display:flex;gap:8px;align-items:center;font-size:13px;padding:4px 10px 4px 0;min-width:0;
position:sticky;left:0;background:var(--bg)}
.sysmap .step b{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;
background:var(--text);color:var(--bg)}
.sysmap .step span{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.sysmap .wire{z-index:1;align-self:center;height:2px;background:var(--accent);opacity:.55}
.sysmap .dot{z-index:2;align-self:center;justify-self:center;width:14px;height:14px;border-radius:50%;background:var(--accent);
box-shadow:0 0 0 3px var(--bg)}
.sysmap .none{z-index:1;align-self:center;font-size:12px;color:var(--muted);font-style:italic;padding-left:10px}
.sev-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.sev{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:10px 12px;border-top-width:3px}
.sev-bad{border-top-color:var(--bad)}.sev-warn{border-top-color:var(--warn)}.sev-ok{border-top-color:var(--ok)}
.sev li em{display:block;font-style:normal;font-size:12px;color:var(--warn)}
.sev h4{margin:0 0 6px;font-size:13px}.sev h4 span{color:var(--muted);font-weight:500}
.sev ul{list-style:none;margin:0;padding:0}.sev li{padding:5px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.35}
.sev li:first-child{border-top:0}.sev li span{display:block;color:var(--muted);font-size:12px}
.syncasync .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.lane-col{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:10px 12px;border-left-width:3px}
.lane-col.sync{border-left-color:var(--accent)}.lane-col.async{border-left-color:var(--muted)}
.lane-col h4{margin:0 0 6px;font-size:13px}.lane-col .group+.group{margin-top:8px}
ul.chips{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
ul.chips li{font-size:12.5px;line-height:1.3;padding:3px 9px;border-radius:999px;background:var(--code)}
.scope .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.scope-col{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:10px 12px;border-top-width:3px}
.scope-col.in{border-top-color:var(--ok)}.scope-col.out{border-top-color:var(--muted)}
.scope-col h4{margin:0 0 4px;font-size:13px}.scope-col h4 span{color:var(--muted);font-weight:500}
.scope-col ol,.scope-col ul{margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.4}.scope-col li{padding:3px 0}
.scope-col.out li{color:var(--muted)}
.board .owners{margin:0 0 10px}.board .owners b{font-weight:600;color:var(--muted)}
.board li strong{font-weight:500}.board .qn{color:var(--muted);font-weight:600}
.board li .owner{display:table;margin-top:4px;font-style:normal;font-size:11.5px;padding:0 8px;border-radius:999px;background:var(--code)}
.bcheck .bar{display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px}
.bcheck .legend{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px}
.bcheck .legend b{color:var(--muted);font-weight:600}
.bcheck .sw{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.r-answered{background:var(--ok)}.r-agent{background:var(--accent)}.r-user{background:var(--warn)}
.r-deferred{background:var(--muted)}.r-other{background:color-mix(in srgb,var(--muted) 45%,transparent)}
.erd .scroll{overflow-x:auto}.erd svg{display:block;margin:0 auto;max-width:none;font-family:inherit}
.erd .node rect{fill:var(--panel);stroke:var(--line)}.erd .node.unlisted rect:first-of-type{stroke-dasharray:4 3;stroke:var(--muted)}
.erd .node .name{font-size:12.5px;font-weight:600;fill:var(--text)}.erd .node .owner{font-size:11px;fill:var(--muted)}
.erd .edge path{fill:none;stroke:var(--accent);stroke-width:1.6;opacity:.7}.erd .edge .card{font-size:11px;font-weight:700;fill:var(--accent)}
.erd .edge:hover path{opacity:1;stroke-width:2.4}
.erd .legend{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px}
.erd .sw{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.dcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.dcol{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:10px 12px;border-top-width:3px;min-width:0}
.dcol h4{margin:0 0 6px;font-size:13px}.dcol h4 span{color:var(--muted);font-weight:500}
.dcol ul{margin:0;padding-left:18px;font-size:13px;line-height:1.4}.dcol li{padding:3px 0}
.d-add{border-top-color:var(--ok)}.d-mod{border-top-color:var(--accent)}.d-rem{border-top-color:var(--bad)}.d-keep{border-top-color:var(--muted)}
.d-rem li{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--bad) 50%,transparent)}
.dcol ul.mods{list-style:none;padding:0}.mods li{display:grid;gap:2px;border-top:1px solid var(--line);padding:6px 0}
.mods li:first-child{border-top:0}.mods .was{color:var(--muted)}.mods .arrow{color:var(--accent);font-weight:700;line-height:1}
.mods .ref{font-size:11.5px;color:var(--muted)}
.d-mod{grid-column:span 2}@media (max-width:560px){.d-mod{grid-column:auto}}
figure.callout{display:flex;flex-direction:column;gap:2px;border-left-width:4px}
figure.callout span{font-size:12px;letter-spacing:.04em;text-transform:uppercase;font-weight:600}
figure.callout em{font-style:normal;font-size:13px;color:var(--muted)}
figure.callout.bad{border-left-color:var(--bad)}figure.callout.bad span{color:var(--bad)}
figure.callout.warn{border-left-color:var(--warn)}figure.callout.warn span{color:var(--warn)}
figure.callout.ok{border-left-color:var(--ok)}figure.callout.ok span{color:var(--ok)}
.summary{display:flex;flex-direction:column;gap:10px}
.summary .claim{display:block;text-decoration:none;color:var(--text);font-size:15.5px;line-height:1.5;
border-left:3px solid var(--warn);padding:2px 0 2px 12px}
.summary .claim span{display:block;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--warn);font-weight:600}
.summary .stats{margin:0}.summary .stats a{color:inherit;text-decoration:none}
`;
