---
type: morphism
class: polity-state-transition
status: draft
depends-on: [polity, image, instance, engine, runtime]
---

# Booting

The morphism that takes a polity from [image](../concepts/image.md) state to [instance](../concepts/instance.md) state.
Booting attaches an [engine](../concepts/engine.md) to the image, starts the clock, activates subscriptions, opens ports, and spawns [services](../concepts/service.md).
After booting, the polity is *running*.

In OS-analogy terms: booting is to PyFARS what `docker run <image>` is to docker, what kernel-boot is to a Linux system, what `apache start` is to Apache.
The polity's identity persists across the transition; what changes is the binding-of-execution-machinery.

## Action

For an image $I$ on host $H$ via runtime $R$, at moment $\tau_{\text{start}}$:

$$\mathrm{booting} \colon (I, H, R) \;\longrightarrow\; \text{Instance}(I, R, H, \tau_{\text{start}})$$

— the runtime instantiates an engine, binds it to the image, and produces a running instance.
The first witness in the post-boot log is the boot-witness recording the start-moment, the runtime-version, the host-identity.

## What booting does

Booting performs (typically in this order):

1. **Validate the image** — read the manifest; verify required files; check runtime-version-compatibility; refuse to boot if the polity is malformed.
2. **Reconcile any out-of-band changes** — compare on-disk system-state against the JSONL log's expected state; surface discrepancies as validation findings.
3. **Instantiate the engine** — load the polity's rule-set, governance, content into the engine's working memory.
4. **Activate subscriptions** — the system's subscription-cells become live trigger-bindings.
5. **Open ports** — listen on configured ports (HTTP, MCP, hooks).
6. **Spawn services** — start each substrate-declared service via the host-supervisor.
7. **Start the clock** — begin emitting ticks at the configured cadence.
8. **Emit the boot-witness** — the first post-boot witness; subsequent witnesses are tick-driven.

## Booting and authority

Booting requires authority over the polity.
Typically the captain (or a designated administrator) initiates booting; in automated deployments, the host-supervisor's identity carries the authority.
Unauthorized booting attempts produce host-level failures, not substrate-witnesses (since substrate is not yet attached to an engine).

## Booting failure modes

Boot can fail at multiple stages:

- **Manifest validation failure** — the image is malformed; refuse to boot.
- **Runtime version mismatch** — the runtime is too old/new for the image's requirements.
- **Reconciliation conflict** — out-of-band edits are inconsistent with the log; the captain must adjudicate before boot continues.
- **Service-spawn failure** — a service refused to start; depending on policy, boot continues with degraded services or aborts.
- **Port-binding failure** — a configured port is occupied on the host; depending on policy, boot continues without that port or aborts.

Each failure-mode produces a specific failure-witness *if* the engine has been instantiated far enough; earlier failures produce host-level diagnostic output but no substrate-witness.

## What this morphism does not specify

- The exact `pyfars run` invocation surface.
  Currently positional-argument-or-default-to-`.
  `; partly settled.
- Boot ordering across multi-instance polities.
  When multiple instances share system-content (replication scenarios), boot-coordination is partly settled.
- Cold vs. warm boot.
  Whether a polity can resume-from-snapshot rather than full-reconcile from log; open.
