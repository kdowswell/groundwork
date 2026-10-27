<!-- source: principles/security/supply-chain-security.md -->

# Supply Chain Security

## Principle
Treat every dependency, build tool, and CI step as code you ship to production. Pin versions, verify provenance, scan for known vulnerabilities, and keep an inventory of what is actually in your artifacts so you can answer "is this affected?" in minutes — not weeks. Treat a dependency that an AI coding assistant introduced as unverified until someone confirms it exists, is the package that was intended, and is pinned in the lockfile: models invent plausible package names, repeat the same invented names across runs, and attackers register them.

Models, datasets, prompts, tools, and tool servers are components too. Allowlist them, pin them to specific versions or hashes, and review them again when their definitions change: a tool whose description changes after you approved it can quietly redirect an agent.

## When This Matters
- You are bootstrapping a new project and choosing dependencies, package managers, and registries
- You are adding a third-party library, container base image, or build action to the pipeline
- A new CVE is published against an upstream package and you need to know whether you are exposed
- You are shipping software customers depend on (SaaS, distributed binaries, container images)
- You are subject to regulation or customer security questionnaires that ask about SBOM, signing, or provenance
- You are setting up CI/CD and deciding what runs with what permissions
- AI coding assistants add or suggest dependencies, write install commands, or edit manifests and CI files

## When This Doesn't Matter
- Throwaway scripts and prototypes that are never deployed and handle no sensitive data
- One-off internal tools where the threat model is purely accidental misuse, not adversarial compromise

## Questions the Agent Should Ask
- How are dependency versions pinned, and what stops a transitive dependency from silently changing under us?
- Where do build artifacts come from, and can we cryptographically verify they were produced by our pipeline (signed provenance)?
- Do we generate an SBOM for production artifacts, and could we answer "are we running Log4j 2.14?" within an hour of a CVE?
- What scans run in CI for known vulnerabilities, and is the build allowed to ship when high-severity issues are unresolved?
- Who can publish to our internal package registry, and could a public package with the same name be installed by mistake (dependency confusion)?
- What permissions do CI jobs and build actions have, and could a compromised action exfiltrate secrets or modify the artifact?
- How do we distinguish a maintained, trusted dependency from an abandoned or single-maintainer package before adopting it?
- When an agent adds a dependency, what confirms that the package exists, is the one intended (not a near-miss name), and is old and maintained enough to trust — before it is installed?
- Can a reviewer tell which changes an AI assistant helped write, and is a human still the one accountable for each merged change?
- Which models, tool servers, and plugins does this system load, who approved them, and what happens if one of them changes its definition after approval?

## What Good Looks Like
- Lockfiles pin exact versions and integrity hashes; updates go through review, not silent floor-version bumps
- Production artifacts are signed and have verifiable provenance linking them to a specific commit and build
- An SBOM is generated per release and stored where security can query it during incidents
- CI/CD runs in isolated, ephemeral environments with scoped credentials; build secrets are not exposed to third-party actions
- Vulnerability scanning runs on every PR and on a schedule against existing artifacts, not just at build time
- Internal package names cannot be shadowed by public registries; private registries are the default resolution path
- A dependency added to a manifest without a matching lockfile entry is flagged at the moment it is added, so its name is checked before anything is installed; installing it then pins it
- New dependencies proposed by an assistant are checked for existence, age, maintainer history, and closeness to a well-known name before install, and the assistant's instructions say to propose, not silently install
- AI involvement in a change is recorded in machine-readable commit or review metadata, and a human signs off on what merges; this is an emerging convention, not yet a standard
- Models and tool servers are allowlisted and pinned; a changed tool definition is detected and re-reviewed before an agent uses it; locally run tool servers execute sandboxed with minimal default access

## What Goes Wrong When You Skip This
- A Log4j-class CVE drops on a Friday and nobody can answer which services include it; the team spends a week grepping codebases instead of patching
- A compromised npm package with a typosquatted name ships to production after a junior dev's `npm install` autocompletes the wrong thing
- A malicious GitHub Action added to a workflow exfiltrates the deploy key, and the attacker pushes a backdoored release that customers install as a "trusted" update
- A transitive dependency changes maintainer, the new maintainer adds credential-stealing code, and the next clean build pulls it in unnoticed
- An agent adds a package that sounds right but never existed; an attacker who registered that commonly hallucinated name ("slopsquatting") now has code running in CI with the deploy credentials
