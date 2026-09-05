---
type: concept
class: tool-subtype
status: draft
depends-on: [tool, action, skill]
---

# Script

A [tool](tool.md) subtype: an executable artifact — a single file, a single argv interface, a single result.
Scripts are tools at their tightest grain: a Python file, a shell command, a native binary.
An agent invokes a script by passing arguments; the script executes deterministically (modulo IO) and produces an output.

Per upstream [agent-skill-recipe-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/agent-skill-recipe-system/_index.md): "A script-runtime skill is the tightest form of recipe.
The script is the executable body of the recipe."

## What distinguishes a script

A script:

1. **Is a single executable artifact** — one Python file, one shell command, one native binary.
  Not a composition.
2. **Has a definite invocation interface** — typed arguments (typically via argparse or equivalent), stdin/stdout, exit status.
  The interface IS its tool-schema.
3. **Executes deterministically** — given the same arguments and system state, produces the same output.
  (Modulo time-varying inputs the script chooses to read; the determinism is conditional on the script's purity.)
4. **Returns explicitly** — success status (exit code 0) or error status (non-zero), with structured output where the script-runtime convention specifies.

A script that violates any of these — composes other scripts internally, lacks a definite interface, executes non-deterministically without declaring it — is moving toward [runbook](runbook.md) territory or is mis-classified as a script.

## Examples in PyFARS

- A `pyfars` CLI verb is roughly script-shaped: argparse interface, deterministic given system state, explicit exit status.
  (Per the realization, verbs are dispatched through Python; a verb is a thin shell over a Python module's `main()` function.)
- A shell command (`git add`, `git commit`, `nginx -t`) is a script.
- A standalone Python utility (e.g., `python tools/render-monograph.py`) is a script.

## Script as tool's tightest grain

Per the upstream theory, the recipe form for a script-runtime skill is:

```
1. parse typed arguments;
2. perform the operation;
3. emit structured output;
4. exit with explicit success or error status.
```

This is the recipe-normal-form at its smallest.
A skill whose `act` slot directly invokes a script is the simplest deployment of agent-skill-recipe-system.
The skill's body documents the script's interface; the script's executable IS the recipe's act-step.

## Composition with other tools

Scripts compose:

- **Pipe composition**: `script1 | script2`.
  Output of one becomes input of another.
  A unix-style composition, common in PyFARS verb chains.
- **Sequenced composition**: a runbook invokes script1, then script2, with branching on script1's result.
- **Parallel composition**: a runbook invokes script1 and script2 concurrently, joining results.

The composition of scripts produces a [runbook](runbook.md).
Conversely: when a runbook is purely script-call-after-script-call with no branching, it might compress back into a single script.
The boundary is partly conventional.

## What this concept does not yet specify

- The discipline for recording script-witness vs. operation-witness.
  When a script invocation produces system effects, is the witness about the script's run, the operation's system effect, or both?
- The relation to *typed* programming-language scripts (Python with type hints, Rust binaries).
  The schema is more checkable; the witness can include typed-output.
  Some script-runtime skills may carry richer schemas than untyped shell commands.
- Cross-platform scripts.
  A script with platform-specific paths or syscalls runs only on certain hosts; the discipline for declaring a script's platform-affordance is partly upstream (computer-system records' role).
