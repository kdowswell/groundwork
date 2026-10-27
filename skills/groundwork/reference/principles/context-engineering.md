<!-- source: principles/design/context-engineering.md -->

# Context Engineering

## Principle
Treat the model's context window as a finite budget with diminishing returns, not as free storage. Each token spent dilutes the attention available for the rest, and recall degrades as the window fills. For every model call, assemble the smallest set of high-signal information that makes the right outcome likely, and compute it as a view over durable state held outside the model: history, memory, documents and tool results live in stores the system owns, and the context is rebuilt from them per step. Load detail just in time through references rather than up front, compact or clear what is no longer needed, keep notes outside the window, and hand noisy exploration to isolated sub-tasks that return only a distilled result. Measure retrieval on its own, separately from generation, because a wrong answer built on the wrong documents is a retrieval bug, not a prompting one.

## When This Matters
- The product sends retrieved documents, conversation history, or tool output to a model, and the amount grows with usage
- An agent runs for many steps, so tool results and history accumulate in the window until quality drops or the limit is hit
- Answer quality varies with which documents happen to be retrieved, and nobody can tell whether a bad answer came from retrieval or generation
- Token cost and latency grow faster than traffic because each request carries more context than the last
- Long sessions must survive restarts, hand-offs between agents, or a switch to a different model

## When This Doesn't Matter
- Single-shot calls with small, fixed inputs (classify this message, extract these fields) where the context never approaches the budget
- Prototypes that prove whether a model can do the task at all; tune context once the task is known to be feasible
- Batch jobs where each input is self-contained and nothing is carried between calls

## Questions the Agent Should Ask
- What does the model actually need to decide this step, and what is in the context only because it was convenient to include?
- Where is the authoritative copy of the conversation, memory, and documents? If the context were thrown away now, could it be rebuilt from durable state?
- What is loaded up front, and what could be fetched on demand from a reference (an identifier, a path, a query) when the model asks for it?
- When the window nears its limit, what happens: truncation, summarization, clearing old tool results? Is that decision reversible, or is the discarded detail gone?
- Which sub-tasks produce a lot of intermediate noise (search, exploration, log reading) that could run in an isolated context and return a short summary?
- How is retrieval quality measured: relevance and recall of the retrieved items against labelled queries, independent of whether the final answer looked right?
- Does a larger context actually improve results here? Has anyone compared a smaller, targeted context against the current one?

## What Good Looks Like
- A context-assembly step is explicit code with a budget: it selects, orders, and trims inputs per step, and its output is logged so a bad answer can be traced to what the model saw
- Durable state lives outside the model: the full session record, notes, and documents sit in stores the system owns, and the context is a derived view of them
- Large artifacts enter the window as references and summaries; the model can request the full item through a tool when it needs it
- Compaction prefers the lightest touch first, such as clearing stale tool output, and keeps the full record outside the window so a later step can recover detail a summary dropped
- Exploration-heavy work runs in isolated sub-contexts that return a distilled result, keeping the coordinating context focused on decisions
- Retrieval has its own evaluation set and metrics (relevance of results, latency, error rate as the corpus grows), run separately from end-to-end answer quality
- Additions to standing context (instructions, overviews, examples) are measured before they are kept, since more context can cost tokens without improving results

## What Goes Wrong When You Skip This
- A support assistant appends every prior message and every retrieved article to each call; after twenty turns it starts contradicting answers from turn three, and per-request cost has quadrupled
- An agent reads entire log files into its window to find one error; the useful line is buried, the window fills, and the run fails or forgets its original goal
- The only copy of a long session lives in the model's context; when the process restarts or the window is summarized, decisions made an hour ago are lost for good
- Answer quality drops after the document corpus doubles, and the team tunes prompts for weeks before discovering the retriever now returns the wrong documents
- A standing instruction file grows with every incident until it costs more per call than the task itself, with no measured gain in success
