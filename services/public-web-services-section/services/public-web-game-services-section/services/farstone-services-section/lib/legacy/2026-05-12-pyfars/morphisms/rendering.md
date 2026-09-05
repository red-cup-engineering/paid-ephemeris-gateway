---
type: morphism
class: projection-morphism
status: draft
depends-on: [substrate, projection, corpus]
realizes: [projection]
---

# Render

The projection morphism family that takes [substrate](../concepts/substrate.md) state and produces transport-readable artifacts: markdown notes, monograph documents, JSON-API responses, BibTeX files, harness-projection output.
Render is *pure* — it reads substrate, produces output, does not write substrate.

The realization in PyFARS is the `pyfars.render` package, with one rendering specialization per output kind.
The CLI exposes render via verbs: `pyfars show <slug>` (single-note render), `pyfars compose <subtree>` (monograph render), and per-target verbs for JSON, BibTeX, etc.

## Action

For each render target $T$, render is a partial function

$$\mathrm{render}_T \colon \mathrm{Substrate} \times \mathrm{Args}_T \;\longrightarrow\; \mathrm{Artifact}_T$$

— system state plus target-specific arguments to a transport-readable artifact.
The function is pure: invoked twice with the same system state and arguments, it produces the same artifact (modulo time-varying fields).

## Render targets

PyFARS's current render specializations include (exact list grows):

- **Single-note markdown** — produces the markdown rendering of one substrate note (`render/show_note.py`).
  Used by `show`.
- **Monograph** — composes notes across a subtree into a single ordered markdown document (`render/monograph.py`).
  Used by `compose`.
- **Audit / plan / stats / impact / diagnostics reports** — formatted-markdown reporting of computed analyses (`render/audit_report.py`, etc.).
- **Context blob** — a budgeted bounded subgraph as a single markdown document for LLM context (`render/context_blob.py`).
  Used by `context`.
- **Frontmatter dump (YAML/JSON)** — serialization of frontmatter for programmatic consumption (`render/fm_dump.py`, `render/json_dump.py`).
- **BibTeX entries / files** — bibliographic projection from `references/` notes (`render/bibtex_entry.py`, `render/bibtex_file.py`).
- **Note template** — frontmatter+body skeletons for new notes (`render/note_template.py`).

## Composition

Render specializations compose.
A monograph render internally calls show-note render for each composed note, then assembles them.
A context-blob render calls a graph-traversal helper, then renders each visited note with show-note render, then concatenates with budget enforcement.

The category-theoretic shape: render targets form a category whose objects are transport types and whose arrows are translations between them.
Markdown can be translated to HTML by an external pandoc step; JSON can be translated to YAML by serialization; etc. PyFARS-side render commits only to the substrate-to-markdown-or-JSON arrows; downstream translation is by composition with external tooling.

## Naturality / functoriality

Render is *natural* in the system's predication-fiber: a closure-preserving substrate morphism $\phi: S \to S'$ commutes with render in the sense that

$$\mathrm{render}_T(\phi(S)) \;=\; (\text{the same artifact, with cells substituted per }\phi)$$

— rendering after settling produces the post-settling artifact.
The proof routes through the upstream functoriality of projection over predication-fibers; the PyFARS-side commitment is that render does not introduce system transitions during rendering.

This naturality is what makes render *safe to call repeatedly* — multiple renders during a settling don't produce diverging artifacts; they produce the artifacts of whichever quiescent substrate they're called against.
Mid-settling renders are partial (PyFARS surfaces a freshness marker), but the underlying morphism is well-defined throughout.

## What render does not do

- It does not modify the system.
  Any verb that needs to record a new cell (e.g., `witness`, `commit`, `move`) is *not* a render verb; it's a transition verb.
- It does not produce HTML directly.
  PyFARS's render targets stop at markdown and structured serialization; HTML is produced by a separate pipeline (Hugo, pandoc, FastAPI templates) running render's output.
- It does not consult external state.
  Render is a function of the system plus arguments; it does not query the network, the filesystem outside the corpus, the clock (except for timestamps), etc.

## Where render is used

- Every substrate-reading verb (`show`, `list`, `search`, `context`, `stats`, `impact`, `ramp`, `compose`).
- The web app's `/api/` endpoints (which call `pyfars.api` functions, which compose render with system reads).
- Harness installation (when a harness produces files, its template-render is a render specialization).
- MCP tool responses (where an MCP tool's return value is a render of the requested substrate slice).

## What this morphism does not yet specify

- The complete set of render targets.
  The realization adds new targets as harnesses and verbs grow.
- The handling of paraconsistent ($\top$) cells in render.
  Different targets handle them differently (markdown surfaces them as `[CONTRADICTION]` markers; JSON returns the bilattice tuple); a uniform discipline is partly settled.
- The freshness discipline.
  When substrate is mid-settling, render produces partial artifacts; the marker for partial-vs-complete is per-target.
