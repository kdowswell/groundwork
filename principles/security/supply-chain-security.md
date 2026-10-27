---
id: supply-chain-security
title: Supply Chain Security
category: security
sources:
  - name: SLSA — Supply-chain Levels for Software Artifacts
    url: https://slsa.dev/
  - name: OWASP Top 10 — Software Supply Chain Failures
    url: https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/
  - name: Sigstore — Signing, Verification, and Provenance
    url: https://www.sigstore.dev/
  - name: GitHub Advisory Database
    url: https://github.com/advisories
  - name: "Spracklen et al. — We Have a Package for You! Package Hallucinations by Code-Generating LLMs (USENIX Security 2025)"
    url: https://arxiv.org/abs/2406.10279
  - name: "OpenSSF — Security-Focused Guide for AI Code Assistant Instructions (2025)"
    url: https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, defense, government, ecommerce, any_production]
tags: [security, dependencies, sbom, provenance, ci-cd, vulnerabilities, ai-assisted-development, package-hallucination]
---

# Supply Chain Security

## Principle
Treat every dependency, build tool, and CI step as code you ship to production. Pin versions, verify provenance, scan for known vulnerabilities, and keep an inventory of what is actually in your artifacts so you can answer "is this affected?" in minutes — not weeks. Treat a dependency that an AI coding assistant introduced as unverified until someone confirms it exists, is the package that was intended, and is pinned in the lockfile: models invent plausible package names, repeat the same invented names across runs, and attackers register them.

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

## What Goes Wrong When You Skip This
- A Log4j-class CVE drops on a Friday and nobody can answer which services include it; the team spends a week grepping codebases instead of patching
- A compromised npm package with a typosquatted name ships to production after a junior dev's `npm install` autocompletes the wrong thing
- A malicious GitHub Action added to a workflow exfiltrates the deploy key, and the attacker pushes a backdoored release that customers install as a "trusted" update
- A transitive dependency changes maintainer, the new maintainer adds credential-stealing code, and the next clean build pulls it in unnoticed
- An agent adds a package that sounds right but never existed; an attacker who registered that commonly hallucinated name ("slopsquatting") now has code running in CI with the deploy credentials

## Further Reading
SLSA defines progressive levels for build integrity, provenance, and trust. OWASP's "Software Supply Chain Failures" entry, promoted to third place in the 2025 Top 10 and widened to cover build and deploy, covers the failure modes seen in real incidents like SolarWinds and Log4j. Sigstore documents the tooling for signing and verifying artifacts; the GitHub Advisory Database is a practical source for tracking known vulnerabilities in dependencies you actually use. Spracklen et al. measured package hallucination across 576,000 generated code samples: at least 5.2% of packages from commercial models and 21.7% from open-source models did not exist, with 205,474 unique invented names, many recurring across repeated runs, which is what makes registering them worthwhile for an attacker. The OpenSSF guide recommends short, specific security instructions for AI coding assistants, including supply-chain rules such as verifying new dependencies before installing them.
