---
type: concept
class: system-executor
status: draft
depends-on: [polity, engine, host, image]
---

# Runtime

The installed PyFARS — the OS.
The runtime is what *can boot polities*.
It is the Python package, the CLI, the supporting libraries, and the infrastructure for instantiating an [engine](engine.md) bound to a [polity-image](image.md).
One [host](host.md) typically has one runtime install (`pip install pyfars` or `nix build .
` produces it).

The runtime is *static*: a fixed body of code, configuration defaults, and library dependencies.
It does not, by itself, *do* anything until invoked.
Invocation produces an engine; the engine binds to an image; the result is a running [instance](instance.md).

## Runtime vs. engine vs. instance

Three distinct things often confused:

- **Runtime** — the installed code.
  What `pyfars --version` reports about.
  Static.
- **Engine** — the *executing component* an invocation produces.
  Active.
  One per running instance.
- **Instance** — a running polity = an engine + an image.
  Active.
  Lives until the engine halts.

In Apache analogies: the apache binary is the runtime; an httpd worker process is an engine; a serving site is an instance.
In Docker: the docker daemon is the runtime; the running daemon-process per host is an engine; a container is an instance.

For PyFARS the runtime/engine line is fluid in current realization (a single `pyfars run` invocation acts as both the engine-spawner and the instance-runner), but the conceptual distinction is load-bearing for refactoring and for federation work.

## What the runtime provides

The runtime provides:

1. **The CLI** — `pyfars` with all its verbs.
2. **The engine** — the orchestration code that boots polities, runs the clock, dispatches work, fires settling.
3. **The verb implementations** — the procedures that verbs call when invoked.
4. **The substrate-purity discipline** — the conventions and checks that keep the system audit-able.
5. **The library API** — `pyfars.api.*` for in-process programmatic use.
6. **The harness templates** — the wirings that polities can install to bind to host systems.

The runtime is *polity-agnostic*: it can boot any well-formed polity.
A polity is *runtime-agnostic*: any compatible runtime version can boot it.

## Runtime versioning

The runtime carries a version.
A polity may declare a runtime-version-requirement (in its manifest) — a runtime older than this requirement may refuse to boot the polity.
Future runtimes may need backward-compatibility shims for older polities; this discipline is partly settled.

## Runtime is outside substrate

Critically: the runtime itself is *not* part of any polity's system.
The polity's system-purity is preserved precisely *because* the runtime is external to the system — substrate doesn't depend on which runtime version is currently installed; substrate is a closure over the JSONL log + the active rule-set, both system-resident.

This is what makes polities portable: take the directory to another host with the same runtime version, and you have the same polity ready to boot.

## What this concept does not yet specify

- The runtime's own boot sequence (host boot → runtime ready).
  Currently host-OS-managed; PyFARS doesn't itself manage runtime startup beyond what `pip install` or `nix build` does.
- Multi-runtime cohabitation.
  Whether two PyFARS runtime versions can coexist on one host.
  Partly settled.
- Runtime upgrade discipline.
  When a host's runtime is upgraded mid-flight (an instance running), the discipline for handling the version-shift is open.
