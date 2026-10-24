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

/**
 * Visuals for an artifact, keyed by the slug of the `##` heading they sit under.
 * @param {{label: string} | null} kind
 * @param {string} source
 * @returns {Map<string, string>}
 */
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
`;
