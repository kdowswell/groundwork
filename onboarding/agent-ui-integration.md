# agent-ui Integration

> **Status:** Stub. Integration ships in Phase 2 alongside the onboarding interview content.

groundwork's onboarding interview can run in two modes:

- **Plain text** — chat-based Q&A through the host agent. No external dependencies.
- **Structured** — uses [agent-ui](https://github.com/kurtdowswell/agent-ui) components (`assess`, `decide`, `rank`, `collect`) for a smoother, form-like experience.

When agent-ui is available, this file maps each onboarding section to the appropriate component and the tool-invocation pattern. Long-term, runtime principle gates can also use agent-ui's `approve` component as architectural decision points during the build phase.

| Section | Component | Notes |
|---|---|---|
| Team Shape | `assess` | Multi-question form |
| Stack | `collect` | Free-form structured input |
| Delivery Process | `decide` | Tradeoff selection between branching/release patterns |
| Compliance | `assess` | Yes/no + qualifying detail per regime |
| Scale Targets | `collect` | Numeric + tier inputs |
| Quality Bar | `rank` | Prioritize quality attributes |
