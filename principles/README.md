# Principles

The core knowledge base. Each `.md` file is one architectural principle, written for AI agent consumption during planning.

## Structure

```
principles/
├── _schema/principle.schema.json   JSON Schema for frontmatter
├── reliability/
├── security/
├── scalability/
├── observability/
├── data/
├── design/
├── delivery/
└── operations/
```

The category directories are fixed (enforced by the schema). The directory a principle lives in must match its `category` frontmatter field.

## Adding a Principle

1. Pick the right category directory.
2. Create a kebab-case filename — e.g. `circuit-breakers.md`. The filename (sans `.md`) must match the `id` frontmatter field.
3. Use [`reliability/fault-isolation.md`](reliability/fault-isolation.md) as the canonical template. Every section heading shown there is required.
4. Fill in the frontmatter:
   - `id` — kebab-case, matches filename
   - `title` — human-readable
   - `category` — matches the parent directory
   - `sources` — at least one `{name, url}` pair attributing the source material
   - `applies_when` — controls when the agent surfaces this principle:
     - `scope`: any of `new_build | epic | feature | story | bug_fix`
     - `scale`: any of `solo | team | enterprise`
     - `stage`: any of `ideation | discovery | refinement | build | maintain`
     - `domains`: open vocabulary; common values include `any_production`, `financial_services`, `healthcare`, `defense`, `ecommerce`
   - `tags` — optional, free-form keywords
5. Run `npm run validate` to confirm frontmatter validates against the schema.

## Writing Principles

- **Distill, don't reproduce.** Cite source material; summarize the principle in your own words.
- **Address the agent in second person** ("consider whether…", "ask the developer…"). The agent is the primary reader.
- **One concept per file.** A principle should be focused enough that the agent can decide whether it's relevant in a single scan of the frontmatter and the first paragraph.
- **Be evaluative, not prescriptive.** "What Good Looks Like" / "What Goes Wrong" gives the agent reasoning material — it's not a checklist to enforce.

See the project [`CLAUDE.md`](../CLAUDE.md) for the full content standards.
