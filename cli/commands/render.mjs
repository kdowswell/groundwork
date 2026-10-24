/**
 * `groundwork render` — a human review view of one artifact (ADR-008).
 *
 * Markdown stays the source of truth; the page is a generated, disposable
 * view written to .groundwork/review/ (git-ignored). With --serve, a
 * loopback-only server shows the page with Approve / Request changes, and the
 * decision is written as an ADR-007 receipt pinned to the digest that was
 * rendered — if the file changed since, the decision is refused.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { detect } from "../engine/detect.mjs";
import { analyzeArtifact, buildPage, messagePage } from "../render/page.mjs";
import { approve, approvedDiff, digestFile, verify } from "./approvals.mjs";
import { activePrincipleIds } from "./doctor.mjs";
import {
  ensureProjectDir,
  isRegularFile,
  resolvesInside,
  toProjectPath,
  writeFileSafe,
} from "./safe-fs.mjs";

const CLI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REVIEW_DIR = join(".groundwork", "review");
const MAX_NAMED_FILES = 20;
const MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_IDLE_MS = 30 * 60 * 1000;

function loadPrinciples() {
  try {
    return JSON.parse(readFileSync(join(CLI_ROOT, "data", "principles.json"), "utf8"));
  } catch {
    return [];
  }
}

/** Active principle ids from .groundwork/context.md, or [] when there is none (ADR-009). */
function activePrinciples(root) {
  const file = join(root, ".groundwork", "context.md");
  if (!existsSync(file) || !isRegularFile(file) || !resolvesInside(root, file)) return [];
  return activePrincipleIds(readFileSync(file, "utf8"));
}

/** Detector findings for project files the artifact names (never outside the root). */
function findingsForNamedFiles(root, artifactPath, namedPaths) {
  const artifactDir = posix.dirname(artifactPath);
  const files = new Set();
  for (const named of namedPaths) {
    for (const candidate of [named, posix.join(artifactDir, named)]) {
      const abs = resolve(root, candidate);
      if (!existsSync(abs) || !isRegularFile(abs) || !resolvesInside(root, abs)) continue;
      const rel = relative(root, abs).split(sep).join("/");
      if (rel !== artifactPath) files.add(rel);
      break;
    }
    if (files.size >= MAX_NAMED_FILES) break;
  }
  const findings = [];
  for (const rel of files) {
    for (const f of detect(join(root, rel), { configRoot: root }).findings) {
      if (f.severity !== "info") findings.push({ ...f, file: rel });
    }
  }
  return findings;
}

/**
 * Render the review page for an artifact.
 * @param {string} root project root
 * @param {string} artifact path to a Markdown artifact
 * @param {object} [opts]
 * @param {string} [opts.checkpoint] override the checkpoint an approval records
 * @param {{token: string}} [opts.form] include the decision form (--serve only)
 * @param {boolean} [opts.write] write the page to .groundwork/review/ (default true)
 */
export function render(root, artifact, opts = {}) {
  const artifactPath = toProjectPath(root, artifact);
  const abs = join(root, artifactPath);
  if (!existsSync(abs) || !isRegularFile(abs)) {
    throw new Error(`artifact does not exist or is not a regular file: ${artifactPath}`);
  }
  const source = readFileSync(abs, "utf8");
  const sha256 = digestFile(abs);
  const library = loadPrinciples();
  const analysis = analyzeArtifact(source, library);
  const activeIds = activePrinciples(root);
  const active = activeIds.map((id) => library.find((p) => p.id === id) ?? { id, title: id, category: "" });
  const checkpoint = opts.checkpoint ?? analysis.kind?.checkpoint ?? null;
  const receipt = verify(root, artifactPath).receipts[0];
  const approval = receipt && receipt.status !== "unapproved" ? receipt : null;
  const findings = findingsForNamedFiles(root, artifactPath, analysis.namedPaths);
  const changes = approval?.status === "stale" ? approvedDiff(root, artifactPath) : null;

  const html = buildPage({
    source,
    artifactPath,
    sha256,
    analysis,
    approval,
    findings,
    changes,
    active,
    checkpoint,
    form: opts.form ?? null,
  });

  let path = null;
  if (opts.write !== false) {
    const dir = ensureProjectDir(root, REVIEW_DIR);
    // Generated views are disposable: keep them out of version control.
    const ignore = join(dir, ".gitignore");
    if (!existsSync(ignore)) writeFileSafe(dir, ignore, "*\n");
    path = join(dir, `${artifactPath.replaceAll("/", "__")}.html`);
    writeFileSafe(dir, path, html);
  }
  return { artifactPath, sha256, checkpoint, analysis, approval, findings, active, html, path };
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("body too large"), { status: 413 }));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * Serve the review page on loopback until the user decides or the server idles out.
 * Resolves once listening with {url, done}; `done` resolves with the outcome:
 * {decision, receipt} after a decision, or {decision: null, reason: "idle"}.
 * @param {string} root
 * @param {string} artifact
 * @param {{checkpoint?: string, port?: number, idleMs?: number, now?: Date}} [opts]
 */
export function serve(root, artifact, opts = {}) {
  const token = randomBytes(24).toString("hex");
  const rendered = render(root, artifact, { checkpoint: opts.checkpoint, form: { token }, write: false });
  if (!rendered.checkpoint) {
    throw new Error(
      `${rendered.artifactPath} is not a groundwork spec, sketch, or data model — pass --checkpoint=<id> to decide on it`,
    );
  }
  const abs = join(root, rendered.artifactPath);

  return new Promise((resolveStart, rejectStart) => {
    let finish;
    const done = new Promise((r) => (finish = r));
    let idle;
    let port;

    const server = createServer(async (req, res) => {
      clearTimeout(idle);
      idle = setTimeout(() => stop({ decision: null, reason: "idle" }), opts.idleMs ?? DEFAULT_IDLE_MS);

      const send = (status, body) => {
        res.writeHead(status, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
          "Referrer-Policy": "same-origin",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(body);
      };

      // Only this loopback origin: blocks DNS rebinding and cross-site form posts.
      const origins = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!origins.includes(req.headers.host ?? "")) return send(421, messagePage("Wrong host", "Open the URL printed in the terminal.", "bad"));

      if (req.method === "GET" && req.url === "/") return send(200, rendered.html);

      if (req.method === "POST" && req.url === "/decision") {
        const origin = req.headers.origin;
        if (origin !== undefined && !origins.some((o) => origin === `http://${o}`)) {
          return send(403, messagePage("Refused", "Decisions are accepted only from this page.", "bad"));
        }
        let form;
        try {
          form = new URLSearchParams(await readBody(req));
        } catch (err) {
          return send(err.status ?? 400, messagePage("Refused", "The request could not be read.", "bad"));
        }
        if (!sameSecret(form.get("token") ?? "", token)) {
          return send(403, messagePage("Refused", "This page's session token does not match.", "bad"));
        }
        const decision = form.get("decision");
        if (decision !== "approved" && decision !== "changes-requested") {
          return send(400, messagePage("Refused", "Unknown decision.", "bad"));
        }
        if (form.get("sha256") !== rendered.sha256 || !existsSync(abs) || digestFile(abs) !== rendered.sha256) {
          return send(
            409,
            messagePage(
              "File changed",
              `${rendered.artifactPath} changed after this page was rendered. Nothing was recorded; re-run groundwork render to review the current version.`,
              "bad",
            ),
          );
        }
        let result;
        try {
          result = approve(root, rendered.artifactPath, {
            checkpoint: rendered.checkpoint,
            decision,
            notes: (form.get("notes") ?? "").trim() || undefined,
            now: opts.now,
          });
        } catch (err) {
          return send(500, messagePage("Not recorded", err.message, "bad"));
        }
        send(
          200,
          messagePage(
            decision === "approved" ? "Approved" : "Changes requested",
            `Recorded ${decision} for ${rendered.artifactPath} at ${rendered.checkpoint}.`,
            decision === "approved" ? "ok" : "warn",
          ),
        );
        // Shut down only after the confirmation page has been flushed.
        res.on("finish", () => stop({ decision, receipt: result.receipt }));
        return;
      }

      return send(404, messagePage("Not found", "Nothing here.", "bad"));
    });

    function stop(outcome) {
      clearTimeout(idle);
      server.close();
      server.closeAllConnections();
      finish(outcome);
    }

    server.on("error", rejectStart);
    server.listen(opts.port ?? 0, "127.0.0.1", () => {
      port = server.address().port;
      idle = setTimeout(() => stop({ decision: null, reason: "idle" }), opts.idleMs ?? DEFAULT_IDLE_MS);
      resolveStart({ url: `http://127.0.0.1:${port}/`, done, rendered, stop });
    });
  });
}
