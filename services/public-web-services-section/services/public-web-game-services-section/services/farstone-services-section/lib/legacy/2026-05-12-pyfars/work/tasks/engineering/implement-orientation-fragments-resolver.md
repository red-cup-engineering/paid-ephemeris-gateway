---
title: "Implement orientation-fragments resolver in install_harness.py"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: orientation-files-derive-from-substrate
depends-on: [author-orientation-fragment-object-record, split-repo-instructions-into-per-runtime-harnesses]
requires-capabilities: [pyfars-package-structure, jinja2-context-extension]
theory-basis: [substrate-purity, projection-not-authoring]
---


## Description

The orientation harnesses' Jinja2 context needs a callable that the templates can use to query substrate fragments by topic and runtime.
Add a resolver to `tools/platform/pyfars/src/pyfars/cli/install_harness.py`:

```python
def _load_orientation_fragments(root: Path, runtime: str) -> Callable[[str], list[dict]]:
    """Return a closure that templates use as `fragments(topic)`.

    Walks <root>/prose/orientations/<topic>/*.md, parses frontmatter,
    filters by runtime ('*' fragments always pass), sorts by ordering then slug,
    returns dicts with keys: slug, topic, prose, derives_from, ordering.
    """
```

The closure exposed to templates as `fragments(topic)` returns the fragment list for the topic, runtime-filtered.
Templates iterate it directly:

```jinja
{% for f in fragments("reading") %}
{{ f.prose }}
{% if not loop.last %}

{% endif %}
{% endfor %}
```

The resolver:

1. Walks `<root>/prose/orientations/<topic>/*.md` (skipping `_index.md` and dotfiles).
2. Parses frontmatter; tolerates missing/malformed records by emitting a `(missing fragment: <path>)` placeholder rather than crashing — the same degradation discipline the captain/ship/polity resolvers use.
3. Filters by `applies-to-runtimes`: a fragment passes if `"*"` is in the list OR `runtime` is in the list.
4. Sorts by `(ordering, slug)`; `ordering` defaults to 100 if absent.
5. Returns the prose body as `prose`, the topic as `topic`, the source citations as `derives_from` (list).

Wire it into `_build_orientation_context` (renamed from `_build_repo_instructions_context` per the splitting task): add `"fragments": <closure>` to the returned dict, where the closure is `_load_orientation_fragments(root, runtime=<harness's runtime>)`.

Each per-runtime install function passes its own `runtime` argument:

- `claude-code-instructions` → `runtime="claude-code"`
- `agentic` → `runtime="agentic"`
- `replit-instructions` → `runtime="replit"`
- `repository` → `runtime="repository"`

A fragment with `applies-to-runtimes: ["*"]` is visible to all four; one with `["claude-code"]` is visible only to `claude-code-instructions`.

## Acceptance

- [ ] `_load_orientation_fragments(root, runtime)` exists in `install_harness.py` returning a `fragments(topic)` callable.
- [ ] The four per-runtime install functions inject the resolver into their Jinja context.
- [ ] A unit test (or smoke check) confirms `fragments("reading")` returns the expected fragment for `runtime="claude-code"` against a fixture polity carrying one fragment with `applies-to-runtimes: ["*"]` and one with `["claude-code"]`.
- [ ] Missing `prose/orientations/` directory does not crash the install; templates render with empty fragment lists for that topic, producing visible empty sections (or the templates skip the section — a template decision, not a resolver decision).

## Progress cells

*(empty — task not yet started)*
