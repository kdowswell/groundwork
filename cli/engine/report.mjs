/**
 * Finding formatters: human-readable and CI-consumable JSON.
 */
import { countBySeverity } from "./detect.mjs";

const BADGE = { error: "✗", warn: "▲", info: "·" };

export function formatHuman(result) {
  const { findings, scannedFiles } = result;
  const lines = [];
  if (findings.length === 0) {
    lines.push(`✓ ${scannedFiles} file(s) scanned, no findings.`);
    return lines.join("\n");
  }
  let currentSeverity = null;
  for (const f of findings) {
    if (f.severity !== currentSeverity) {
      currentSeverity = f.severity;
      lines.push(`\n${currentSeverity.toUpperCase()}`);
    }
    const location = f.file ? (f.line ? `${f.file}:${f.line}` : f.file) : "(repository)";
    lines.push(`  ${BADGE[f.severity]} [${f.rule}] ${location}`);
    lines.push(`      ${f.message}  (principle: ${f.principle})`);
    if (f.excerpt) lines.push(`      > ${f.excerpt}`);
  }
  const counts = countBySeverity(findings);
  lines.push(
    `\n${findings.length} finding(s) in ${scannedFiles} file(s): ` +
      `${counts.error} error, ${counts.warn} warn, ${counts.info} info.`,
  );
  lines.push(
    `Waive a finding: add a comment 'groundwork-disable <rule-id>: reason', or use .groundwork/config.json.`,
  );
  return lines.join("\n");
}

export function formatJson(result) {
  return JSON.stringify(
    {
      version: 1,
      scannedFiles: result.scannedFiles,
      counts: countBySeverity(result.findings),
      findings: result.findings,
    },
    null,
    2,
  );
}
