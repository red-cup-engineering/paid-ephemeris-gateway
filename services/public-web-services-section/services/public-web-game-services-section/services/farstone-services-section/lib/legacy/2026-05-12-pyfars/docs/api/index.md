# API Reference

PyFARS is organized into four frames per FARS theory's *four-frame discipline* (`concepts/directory.md`, `concepts/system.md`, `concepts/polity.md`, `concepts/program.md`).
Each Python package corresponds to one frame or to the cross-frame surface:

| Package | Frame | Role |
|---------|-------|------|
| `pyfars.kernel` | system | The cell store, closure-rule applicator, query helpers, operators, projectors, witness construction, event log |
| `pyfars.programs` | program | Concrete program-frame classes — `EngineProgram`, `HarnessProgram`, `ScriptProgram`, materializers, bridges, federation |
| `pyfars.sdk` | cross-frame | Pydantic entity-typed views over cells (`Agent`, `Assignment`, `JuralRelation`, `Office`, …) and the shared substrate-operation tool surface |
| `pyfars.client` | cross-frame | UDS client for talking to a running `EngineProgram` |
| `pyfars.apps` | program | The `pyfars` CLI entry points and the materializer-template package data |

See the [Overview](../PyFARS_Overview.md) for the architecture narrative.
The pages in this section are auto-generated from source docstrings; vocabulary follows the four-frame discipline rigorously (*substrate* = whole stack; *system* = cell-store frame; *directory* = filesystem frame; *polity* = institutional frame; *program* = process frame).
