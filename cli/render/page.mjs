/**
 * Build the review page for one artifact (ADR-008): the rendered Markdown plus
 * a decision panel with what a reviewer needs to accept or push back.
 *
 * The page is a self-contained HTML document: inline CSS, light and dark
 * themes, no scripts, and a Content-Security-Policy that blocks every network
 * load. Approval happens through a plain form post, and only in --serve mode.
 */
import { diffHunks, diffStats } from "./diff.mjs";
import { escapeHtml, renderInline, renderMarkdown, slugify } from "./markdown.mjs";
import { column, deriveVisuals, sectionTable, TOP, VISUAL_CSS } from "./visuals.mjs";

/** Artifact kinds groundwork produces, keyed by their H1 prefix. */
export const ARTIFACT_KINDS = [
  { prefix: "Spec:", label: "Spec", checkpoint: "greenfield-spec-from-idea/accept" },
  { prefix: "Architecture:", label: "Architecture sketch", checkpoint: "greenfield-architecture-sketch/accept" },
  { prefix: "Data Model:", label: "Data model", checkpoint: "greenfield-data-model-first/accept" },
];

const PRINCIPLE_URL = "https://github.com/kdowswell/groundwork/blob/main/principles";

/**
 * Extract the decision-relevant structure from an artifact's Markdown.
 * @param {string} source
 * @param {Array<{id: string, title: string, category: string}>} principles
 */
export function analyzeArtifact(source, principles = []) {
  const text = source.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const h1 = (lines.find((l) => /^#\s+/.test(l)) ?? "").replace(/^#\s+/, "").trim();
  const kind = ARTIFACT_KINDS.find((k) => h1.startsWith(k.prefix)) ?? null;

  const questions = [];
  const builder = sectionTable(lines, "Builder Check");
  // Artifacts often prepend a "#" column, so find columns by header, not position.
  if (builder) {
    const qCol = column(builder, /question/i, 0);
    const rCol = column(builder, /resolution/i, qCol + 1);
    for (const row of builder.rows) {
      const resolution = row[rCol] ?? "";
      if (/^\s*(\*\*)?user\b/i.test(resolution) && !/answered|resolved/i.test(resolution)) {
        questions.push({ source: "Builder check", text: row[qCol] ?? "" });
      }
    }
  }
  const open = sectionTable(lines, "Open Questions");
  if (open) {
    const qCol = column(open, /question/i, 0);
    const catCol = column(open, /category/i, -1);
    for (const row of open.rows) {
      if (catCol !== -1 && /blocking/i.test(row[catCol] ?? "")) {
        questions.push({ source: "Blocking open question", text: row[qCol] ?? "" });
      }
    }
  }

  const cited = principles.filter((p) => new RegExp(`(^|[^a-z0-9-])${p.id}([^a-z0-9-]|$)`).test(text));

  // Paths the artifact names in code spans or relative links; resolution happens in the caller.
  const named = new Set();
  for (const m of text.matchAll(/`([^`\s]+\.[A-Za-z0-9]+)`/g)) named.add(m[1]);
  for (const m of text.matchAll(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g)) named.add(m[1]);

  return {
    title: h1 || "Untitled artifact",
    kind,
    workingSpec: /^#{1,6}\s+Working Spec \(unapproved\)/im.test(text),
    questions,
    cited,
    namedPaths: [...named],
  };
}

const CSS = `
:root{--bg:#f7f7f5;--panel:#fff;--text:#1d1d1f;--muted:#5f6368;--line:#e2e2de;--accent:#2457c5;
--ok:#1e7a46;--ok-bg:#e6f4ec;--warn:#9a5b00;--warn-bg:#fdf1dc;--bad:#b3261e;--bad-bg:#fbe9e7;--code:#f0f0ec}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--panel:#1d1d20;--text:#e8e8ea;--muted:#a0a0a8;
--line:#2f2f34;--accent:#8ab4ff;--ok:#7dd3a0;--ok-bg:#183326;--warn:#f2c46b;--warn-bg:#3a2c12;
--bad:#f2a199;--bad-bg:#3d1c1a;--code:#26262b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);
font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
header{padding:20px 16px;border-bottom:1px solid var(--line);background:var(--panel)}
header .wrap,main{max-width:1180px;margin:0 auto}
header h1{margin:4px 0;font-size:22px}.meta{color:var(--muted);font-size:13px}
.meta code{background:none;padding:0}
main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;padding:24px 16px}
@media (max-width:880px){main{grid-template-columns:minmax(0,1fr)}aside{order:-1}}
main>*{min-width:0}article,aside{overflow-wrap:anywhere}
article,aside .card{background:var(--panel);border:1px solid var(--line);border-radius:10px}
article{padding:8px 28px 28px}aside .card{padding:16px;margin-bottom:16px}
aside pre code{white-space:pre-wrap;overflow-wrap:anywhere}
aside h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:0 0 10px}
article>h1:first-of-type{display:none}article h1{font-size:24px}article h2{border-bottom:1px solid var(--line);padding-bottom:4px;margin-top:28px}
code{background:var(--code);padding:1px 5px;border-radius:4px;font:13px/1.5 ui-monospace,Menlo,monospace}
pre{background:var(--code);padding:12px;border-radius:8px;overflow-x:auto}pre code{padding:0}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
blockquote{margin:12px 0;padding:4px 14px;border-left:3px solid var(--line);color:var(--muted)}
a{color:var(--accent)}ul.plain{list-style:none;padding:0;margin:0}ul.plain li{padding:6px 0;border-top:1px solid var(--line)}
ul.plain li:first-child{border-top:0}.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:13px;font-weight:600}
.ok{color:var(--ok);background:var(--ok-bg)}.warn{color:var(--warn);background:var(--warn-bg)}.bad{color:var(--bad);background:var(--bad-bg)}
.banner{padding:10px 14px;border-radius:8px;margin:0 0 16px}.small{font-size:13px;color:var(--muted)}
textarea{width:100%;min-height:80px;font:inherit;padding:8px;border-radius:6px;border:1px solid var(--line);
background:var(--bg);color:var(--text)}
.actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
section.changes{border:1px solid var(--line);border-radius:8px;margin:20px 0 8px;overflow:hidden}
section.changes>header{padding:10px 14px;border-bottom:1px solid var(--line);background:var(--bg)}
section.changes h2{margin:0;border:0;padding:0;font-size:17px}
.stat-add{color:var(--ok);font-weight:600}.stat-del{color:var(--bad);font-weight:600}
.hunk{font:12.5px/1.55 ui-monospace,Menlo,monospace;overflow-x:auto}
.hunk+.hunk{border-top:1px dashed var(--line)}
.hh{padding:4px 14px;color:var(--muted);background:var(--code)}
.dl{display:grid;grid-template-columns:3.2em 3.2em 1.4em minmax(0,1fr);white-space:pre-wrap;overflow-wrap:anywhere}
.dl .n{color:var(--muted);text-align:right;padding-right:6px;user-select:none}
.dl .o{text-align:center;user-select:none}
.dl.add{background:var(--ok-bg)}.dl.add .o{color:var(--ok)}
.dl.del{background:var(--bad-bg)}.dl.del .o{color:var(--bad)}
.dl.del .t{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--bad) 45%,transparent)}
button{font:inherit;font-weight:600;padding:8px 14px;border-radius:6px;border:1px solid var(--line);cursor:pointer;
background:var(--panel);color:var(--text)}button.primary{background:var(--ok);border-color:var(--ok);color:var(--panel)}
`;

const STATUS = {
  fresh: { cls: "ok", text: "Approved, unchanged since" },
  stale: { cls: "bad", text: "Changed since approval" },
  missing: { cls: "bad", text: "Receipt points at a missing file" },
  invalid: { cls: "bad", text: "Approval receipt is invalid" },
  unapproved: { cls: "warn", text: "Not yet approved" },
};

const MAX_DIFF_LINES = 400;

/** "Changes since approval" for a stale artifact (ADR-009). */
function changesSection(approval, changes) {
  if (!approval || approval.status !== "stale" || !changes) return "";
  const when = `${escapeHtml(approval.decision)} on ${escapeHtml(approval.date ?? "")}`;
  const head = (summary) =>
    `<header><h2>Changes since approval</h2><div class="small">${summary}</div></header>`;
  if (changes.ops === undefined) {
    return `<section class="changes" id="changes">${head(
      `This file changed after it was ${when}, but no snapshot of that version was saved, so the change can't be shown. Approvals recorded from now on keep one.`,
    )}</section>`;
  }
  if (changes.ops === null) {
    return `<section class="changes" id="changes">${head(`This file changed too much since it was ${when} to show a diff. Review it in full.`)}</section>`;
  }
  const { added, removed } = diffStats(changes.ops);
  let shown = 0;
  const hunks = [];
  for (const h of diffHunks(changes.ops)) {
    if (shown >= MAX_DIFF_LINES) break;
    const rows = h.lines.slice(0, MAX_DIFF_LINES - shown).map((o) => {
      const cls = o.op === "+" ? "add" : o.op === "-" ? "del" : "ctx";
      const mark = o.op === " " ? "" : o.op === "-" ? "−" : "+";
      return `<div class="dl ${cls}"><span class="n">${o.a ?? ""}</span><span class="n">${o.b ?? ""}</span><span class="o">${mark}</span><span class="t">${escapeHtml(o.text) || " "}</span></div>`;
    });
    shown += rows.length;
    hunks.push(`<div class="hunk"><div class="hh">Line ${h.bStart}</div>${rows.join("")}</div>`);
  }
  const more = shown >= MAX_DIFF_LINES ? `<div class="hh">Diff truncated at ${MAX_DIFF_LINES} lines.</div>` : "";
  return `<section class="changes" id="changes">${head(
    `<span class="stat-add">+${added}</span> <span class="stat-del">−${removed}</span> lines since it was ${when}. Approving now records the current version.`,
  )}${hunks.join("")}${more}</section>`;
}

function approvalBadge(approval) {
  if (!approval) return `<span class="badge warn">Not yet approved</span>`;
  if (approval.status === "fresh" && approval.decision === "changes-requested") {
    return `<span class="badge bad">Changes requested (${escapeHtml(approval.date ?? "")})</span>`;
  }
  const s = STATUS[approval.status] ?? STATUS.unapproved;
  if (approval.status === "stale") return `<a class="badge ${s.cls}" href="#changes">${s.text}</a>`;
  const suffix =
    approval.status === "fresh"
      ? ` ${escapeHtml(approval.date ?? "")}${approval.decidedBy === "agent-delegated" ? " · delegated to agent" : ""}`
      : "";
  return `<span class="badge ${s.cls}">${s.text}${suffix}</span>`;
}

/**
 * @param {object} p
 * @param {string} p.source            artifact Markdown
 * @param {string} p.artifactPath      repo-relative path
 * @param {string} p.sha256            digest the page was rendered from
 * @param {ReturnType<typeof analyzeArtifact>} p.analysis
 * @param {object|null} p.approval     verify() receipt entry, if any
 * @param {Array<object>} p.findings   detector findings for named files
 * @param {object|null} [p.changes]    approvedDiff() result when the approval is stale
 * @param {string|null} p.checkpoint   checkpoint id an approval would record
 * @param {{token: string}|null} p.form present only in --serve mode
 */
export function buildPage(p) {
  const visuals = deriveVisuals(p.analysis.kind, p.source);
  const { html: body } = renderMarkdown(p.source, {
    afterHeading: (level, text) => (level === 2 ? (visuals.get(slugify(text)) ?? "") : ""),
  });
  const a = p.analysis;
  const kindLabel = a.kind ? a.kind.label : "Artifact";

  const questions =
    a.questions.length === 0
      ? `<p class="small">None recorded. The builder check found nothing that changes what gets built.</p>`
      : `<ul class="plain">${a.questions
          .map((q) => `<li>${renderInline(q.text)}<div class="small">${escapeHtml(q.source)}</div></li>`)
          .join("")}</ul>`;

  const principles =
    a.cited.length === 0
      ? `<p class="small">No principles cited.</p>`
      : `<ul class="plain">${a.cited
          .map(
            (pr) =>
              `<li><a href="${PRINCIPLE_URL}/${escapeHtml(pr.category)}/${escapeHtml(pr.id)}.md">${escapeHtml(pr.title)}</a> <span class="small">${escapeHtml(pr.id)}</span></li>`,
          )
          .join("")}</ul>`;

  const findings =
    p.findings.length === 0
      ? `<p class="small">No detector findings in files this ${escapeHtml(kindLabel.toLowerCase())} names.</p>`
      : `<ul class="plain">${p.findings
          .slice(0, 12)
          .map(
            (f) =>
              `<li><span class="badge ${f.severity === "error" ? "bad" : "warn"}">${escapeHtml(f.severity)}</span> <code>${escapeHtml(f.rule)}</code><div class="small">${escapeHtml(f.file)}:${escapeHtml(f.line ?? "?")} · ${escapeHtml(f.message)}</div></li>`,
          )
          .join("")}</ul>`;

  let decide;
  if (!p.checkpoint) {
    decide = `<p class="small">Not a groundwork spec, sketch, or data model. Pass <code>--checkpoint=&lt;id&gt;</code> to record a decision.</p>`;
  } else if (p.form) {
    const blocked =
      a.questions.length > 0
        ? `<p class="banner warn">${a.questions.length} open question(s) listed below. Approving now means accepting the ${escapeHtml(kindLabel.toLowerCase())} with them unanswered.</p>`
        : "";
    decide = `${blocked}<form method="post" action="/decision">
<input type="hidden" name="token" value="${escapeHtml(p.form.token)}">
<input type="hidden" name="sha256" value="${escapeHtml(p.sha256)}">
<label class="small" for="notes">Notes (optional)</label>
<textarea id="notes" name="notes" maxlength="2000"></textarea>
<div class="actions"><button class="primary" type="submit" name="decision" value="approved">Approve</button>
<button type="submit" name="decision" value="changes-requested">Request changes</button></div>
<p class="small">Records <code>${escapeHtml(p.checkpoint)}</code> pinned to this exact version.</p></form>`;
  } else {
    decide = `<p class="small">Read-only view. To decide in the browser, run:</p>
<pre><code>npx groundwork render ${escapeHtml(p.artifactPath)} --serve</code></pre>
<p class="small">or record it directly:</p>
<pre><code>npx groundwork approve ${escapeHtml(p.artifactPath)} --checkpoint=${escapeHtml(p.checkpoint)}</code></pre>`;
  }

  const working = a.workingSpec
    ? `<p class="banner warn">Built on a <strong>Working Spec (unapproved)</strong>: accepting this also accepts the requirements it assumed.</p>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(a.title)} · groundwork review</title>
<style>${CSS}${VISUAL_CSS}</style></head>
<body>
<header><div class="wrap"><div class="meta">${escapeHtml(kindLabel)} · <code>${escapeHtml(p.artifactPath)}</code> · sha256 ${escapeHtml(p.sha256.slice(0, 12))}…</div>
<h1>${escapeHtml(a.title)}</h1>${approvalBadge(p.approval)}</div></header>
<main>
<article>${changesSection(p.approval, p.changes ?? null)}${working}${visuals.get(TOP) ?? ""}${body}</article>
<aside>
<div class="card"><h2>Decision</h2>${decide}</div>
<div class="card"><h2>Open questions for you</h2>${questions}</div>
<div class="card"><h2>Principles cited</h2>${principles}</div>
<div class="card"><h2>Detector findings</h2>${findings}</div>
</aside>
</main>
</body></html>
`;
}

/** Small standalone page for server responses. */
export function messagePage(title, message, cls = "ok") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'">
<meta name="color-scheme" content="light dark"><title>${escapeHtml(title)}</title><style>${CSS}</style></head>
<body><main style="display:block;max-width:640px"><div class="card" style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:20px">
<h1 style="font-size:20px;margin-top:0">${escapeHtml(title)}</h1><p class="banner ${cls}">${escapeHtml(message)}</p>
<p class="small">You can close this tab.</p></div></main></body></html>
`;
}
