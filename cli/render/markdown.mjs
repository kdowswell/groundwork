/**
 * Minimal Markdown → HTML renderer for groundwork artifacts (ADR-008).
 *
 * Supports a deliberate subset: ATX headings, paragraphs, bullet and ordered
 * lists (nested by indentation), fenced code, GFM pipe tables, blockquotes,
 * horizontal rules, and inline code / bold / italic / links.
 *
 * Artifacts come from the repository, which may be untrusted, so every piece
 * of source text is HTML-escaped and raw HTML (including inline SVG) is never
 * passed through. Links are kept only for http(s), mailto, anchors, and
 * relative paths.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Anchor id for a heading: lowercase, alphanumerics and hyphens only. */
export function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/&[a-z0-9#]+;/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/** Allow http(s), mailto, in-page anchors, and relative paths; drop anything else. */
export function safeHref(url) {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("//")) return null;
  return u;
}

/** Inline formatting on one line of raw text. Returns HTML. */
export function renderInline(raw) {
  // Pull code spans out first so their contents are never formatted.
  const codes = [];
  let text = raw.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  text = escapeHtml(text);
  // URLs may contain one level of balanced parentheses, e.g. javascript:alert(1).
  text = text.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (match, label, url) => {
    // url is already escaped, so it is safe inside a quoted attribute.
    const href = safeHref(url.replace(/&amp;/g, "&"));
    return href === null ? label : `<a href="${escapeHtml(href)}">${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, "$1<em>$2</em>");
  text = text.replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>");
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

const SHORT_LINE = 60;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

/**
 * Parse a pipe table at `lines[i]` (header) / `lines[i+1]` (separator).
 * @returns {{header: string[], rows: string[][], end: number}}
 */
export function parseTable(lines, i) {
  const header = splitRow(lines[i]);
  const rows = [];
  let j = i + 2;
  while (j < lines.length && lines[j].includes("|") && lines[j].trim() !== "") {
    rows.push(splitRow(lines[j]));
    j++;
  }
  return { header, rows, end: j };
}

function renderList(lines, i) {
  // Collect contiguous list lines (and their continuation lines).
  const items = [];
  let j = i;
  while (j < lines.length) {
    const m = lines[j].match(LIST_ITEM);
    if (m) {
      items.push({ indent: m[1].replace(/\t/g, "    ").length, ordered: /\d/.test(m[2]), text: m[3] });
      j++;
    } else if (lines[j].trim() !== "" && /^\s{2,}\S/.test(lines[j]) && items.length > 0) {
      items[items.length - 1].text += ` ${lines[j].trim()}`;
      j++;
    } else {
      break;
    }
  }

  let html = "";
  const stack = []; // {indent, tag}
  for (const item of items) {
    const tag = item.ordered ? "ol" : "ul";
    while (stack.length > 0 && item.indent < stack[stack.length - 1].indent) {
      html += `</li></${stack.pop().tag}>`;
    }
    const top = stack[stack.length - 1];
    if (!top || item.indent > top.indent) {
      html += `<${tag}>`;
      stack.push({ indent: item.indent, tag });
    } else {
      html += "</li>";
    }
    html += `<li>${renderInline(item.text)}`;
  }
  while (stack.length > 0) html += `</li></${stack.pop().tag}>`;
  return { html, end: j };
}

/**
 * Render Markdown to HTML.
 * @param {string} source
 * @param {{afterHeading?: (level: number, text: string) => string}} [opts]
 *   afterHeading returns trusted HTML to insert right after a heading
 * @returns {{html: string, headings: Array<{level: number, text: string, id: string}>}}
 */
export function renderMarkdown(source, opts = {}) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const headings = [];
  const usedIds = new Map();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = line.match(/^\s*(```|~~~)(.*)$/);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++; // closing fence
      out.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const inner = renderInline(heading[2]);
      let id = slugify(inner);
      const seen = usedIds.get(id) ?? 0;
      usedIds.set(id, seen + 1);
      if (seen > 0) id = `${id}-${seen}`;
      headings.push({ level, text: heading[2], id });
      out.push(`<h${level} id="${id}">${inner}</h${level}>`);
      const extra = opts.afterHeading?.(level, heading[2]);
      if (extra) out.push(extra);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const { header, rows, end } = parseTable(lines, i);
      const th = header.map((c) => `<th>${renderInline(c)}</th>`).join("");
      const trs = rows
        .map((r) => `<tr>${header.map((_, k) => `<td>${renderInline(r[k] ?? "")}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<div class="table"><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`);
      i = end;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quoted.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(quoted.join("\n")).html}</blockquote>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const { html, end } = renderList(lines, i);
      out.push(html);
      i = end;
      continue;
    }

    const para = [];
    const paraRaw = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*(```|~~~)/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !LIST_ITEM.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1]))
    ) {
      paraRaw.push(lines[i]);
      para.push(lines[i++].trim().replace(/\\$/, ""));
    }
    // Keep a source line break after a short line (templates put one fact per line: Name:,
    // Owner:) or a Markdown hard break; join hard-wrapped prose with a space.
    const parts = para.map(renderInline);
    let html = parts[0];
    for (let k = 1; k < parts.length; k++) {
      const prev = paraRaw[k - 1];
      html += (prev.length < SHORT_LINE || / {2}$|\\$/.test(prev) ? "<br>\n" : "\n") + parts[k];
    }
    out.push(`<p>${html}</p>`);
  }

  return { html: out.join("\n"), headings };
}
