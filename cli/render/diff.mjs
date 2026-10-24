/**
 * Line diff between an approved snapshot and the current artifact (ADR-009).
 *
 * Myers' O(ND) algorithm over lines, with hunks grouped GNU-style (changed
 * lines plus surrounding context). No dependencies, deterministic output.
 */

const MAX_EDITS = 4000;

/**
 * @param {string} before
 * @param {string} after
 * @returns {Array<{op: " " | "-" | "+", text: string, a: number|null, b: number|null}> | null}
 *   one entry per line (a/b are 1-based line numbers), or null when the edit
 *   distance exceeds MAX_EDITS
 */
export function lineDiff(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, MAX_EDITS);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace = [];

  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }
  if (!found) return null;

  // Walk the trace backwards to recover the edit script.
  const ops = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1]) ? k + 1 : k - 1;
    const prevX = vd[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ op: " ", text: a[x - 1], a: x, b: y });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) ops.push({ op: "+", text: b[y - 1], a: null, b: y });
      else ops.push({ op: "-", text: a[x - 1], a: x, b: null });
    }
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

function splitLines(text) {
  const normalized = String(text).replace(/\r\n/g, "\n");
  if (normalized === "") return [];
  const lines = normalized.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Count added and removed lines. */
export function diffStats(ops) {
  let added = 0;
  let removed = 0;
  for (const o of ops) {
    if (o.op === "+") added++;
    else if (o.op === "-") removed++;
  }
  return { added, removed };
}

/**
 * Group changes into hunks with `context` unchanged lines around each.
 * @returns {Array<{aStart: number, aLen: number, bStart: number, bLen: number, lines: typeof ops}>}
 */
export function diffHunks(ops, context = 3) {
  const changed = [];
  ops.forEach((o, i) => {
    if (o.op !== " ") changed.push(i);
  });
  const hunks = [];
  let i = 0;
  while (i < changed.length) {
    let start = Math.max(0, changed[i] - context);
    let end = Math.min(ops.length - 1, changed[i] + context);
    while (i + 1 < changed.length && changed[i + 1] - context <= end + 1) {
      i++;
      end = Math.min(ops.length - 1, changed[i] + context);
    }
    const lines = ops.slice(start, end + 1);
    const firstA = lines.find((o) => o.a !== null);
    const firstB = lines.find((o) => o.b !== null);
    hunks.push({
      aStart: firstA ? firstA.a : lineBefore(ops, start, "a"),
      aLen: lines.filter((o) => o.op !== "+").length,
      bStart: firstB ? firstB.b : lineBefore(ops, start, "b"),
      bLen: lines.filter((o) => o.op !== "-").length,
      lines,
    });
    i++;
  }
  return hunks;
}

/** Unified-diff convention: an empty side starts at the line before the hunk. */
function lineBefore(ops, index, side) {
  for (let j = index - 1; j >= 0; j--) if (ops[j][side] !== null) return ops[j][side];
  return 0;
}

/** Unified diff text (no file headers beyond the two labels). */
export function formatUnified(ops, labelA, labelB, context = 3) {
  const out = [`--- ${labelA}`, `+++ ${labelB}`];
  for (const h of diffHunks(ops, context)) {
    out.push(`@@ -${h.aStart},${h.aLen} +${h.bStart},${h.bLen} @@`);
    for (const o of h.lines) out.push(`${o.op}${o.text}`);
  }
  return out.join("\n");
}
