---
title: "FARS endpoint reply contract"
description: "The fixed completion-shape LLM endpoints emit so the engine can land their reply as a draft artifact without LLM-judgement."
kind: spec
status: superseded
date-superseded: "2026-05-08"
version: "0.1"
---

# Endpoint reply contract

**Status: superseded.** This spec described a contract between LLM endpoints and the earlier `pyfars work ingest` verb, which extracted a draft substrate artifact from an execution-event's `## Completion` section by parsing two fenced code blocks (a YAML block for frontmatter + a markdown block for body).

The May 2026 refactor removed `pyfars work ingest` along with the rest of the `cli/work/*` tree.
Agent invocation now runs through `runtime/dispatch_graph.invoke_agent_node`, which calls `await compiled.agent.run(prompt)` against a PydanticAI Agent.
The response is captured in `InvocationRecord.response` (a string) and witnessed via an `agent_invoked` witness; there is no auto-ingestion step writing markdown drafts.

If a future workflow wants substrate artifacts produced from agent invocations, the architecture is:

- Use PydanticAI's structured-output features to type the agent's response (the agent compiler currently uses `output_type=str`; switching to a Pydantic model gives schema-validated structured output without the two-fenced-blocks parsing).
- Or: run a downstream consolidation/promotion workitem (`runtime/promote.py`'s settlement-path operator) that reads recent `agent_invoked` witnesses and lifts their responses into substrate cells.

The two-fenced-blocks pattern is preserved here for historical reference; new task authors should use PydanticAI structured output instead.

## Original spec (historical)

`pyfars work ingest` extracted a draft substrate artifact from an execution-event's `## Completion` section.
The required shape was two fenced code blocks:

````
```yaml
# frontmatter for the produced artifact title: "..." kind: ...
```

```markdown
# Body of the produced artifact ...
```
````

The ingester:

1. Took the first `yaml` block (subsequent yaml blocks ignored).
2. Took the first `markdown` block (subsequent markdown blocks ignored).
3. Rejected the reply if either block was missing, if the markdown block preceded the yaml block, or if the yaml did not parse with `yaml.safe_load`.

Provenance injection added three frontmatter keys after extraction: `produced-by: dispatch-ingest`, `produced-from: <execution-event-slug>`, `produced-at: <iso-utc-timestamp>`.

Drafts landed at `<root>/.fars/drafts/<stamp>-<slug>.md`, outside the corpus walk so accepted artifacts had to be moved deliberately.
Failures wrote a `kind: observation` record under `operations/engineering/work/track/`.

This pattern is preserved as background; the runtime no longer implements it.
