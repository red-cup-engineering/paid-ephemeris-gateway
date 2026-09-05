---
title: "Support systemd LoadCredential= for endpoint API keys in systemd-user harness"
type: task
area: engineering
status: open
horizon: captured
milestone: m3-continuous-loop
goal: secrets-not-in-process-environment
depends-on: []
requires-capabilities: [code-authoring, harness-template-authoring, systemd-user-knowledge]
theory-basis: [boundary-discipline-on-secrets]
---


## Description

Today the systemd-user harness writes `EnvironmentFile=-{{ env_file }}` into the unit, sourcing API keys from `<root>/.pyfars/secrets.env`.
That puts the keys in `os.environ` of the engine process — visible via `cat /proc/<pid>/environ`, leakable into journal lines on accidental log-of-env, and captured into any subprocess's env unless explicitly stripped.
That's a bad place for credentials.

systemd's `LoadCredential=` directive places named credential files into a unit-private `$CREDENTIALS_DIRECTORY/` (mode 0400, owned by the unit's user), readable only by that unit, never inherited by subprocesses by default, never flattened into `os.environ`.
The 561 polity's `secrets-systemd-load-credential` audit-substrate-bootstrap task names this as the target shape.

Two changes:

1. **Harness template + service-spec schema.** Add a `load-credentials:` list field to the engine-service-spec record schema (`governance/specifications/engine-service-spec.md` in pyfars).
  Each entry has a `name` (the credential name systemd will use) and a `source` (the on-host path to the encrypted-at-rest credential file).
  The systemd-user template `pyfars-engine.service.j2` projects each entry as a `LoadCredential=<name>:<source>` line.

2. **PyFARS endpoint resolver.** `pyfars/entities/endpoint.py`'s `Endpoint.has_credentials` (and any `auth_env_var` consumer) reads `$CREDENTIALS_DIRECTORY/<credential-name>` first, falls back to `os.environ.get(auth_env_var)` only if the credentials directory is unset or the file absent.
  Backward-compatible: dev-mode without LoadCredential= still works via env-vars.

The 561 polity's `governance/specifications/services/pyfars-engine.md` will then declare `load-credentials:` entries pointing at the on-host secret files (currently at `/home/emsenn/561/.secrets`, eventually at agenix-decrypted paths).

## Why this matters

- **Boundary discipline on secrets.** The substrate models capability as a relation between an office and a credential; flattening that into `os.environ` collapses the relation into "every code path running in this process has the key."
  LoadCredential= keeps the credential as a file the consumer-of-record reads explicitly, which the substrate can audit-witness on read.
- **Subprocess isolation.** PyFARS spawns LLM-backed agents, MCP servers, the web service, etc. None of those should inherit the API keys in env by default.
  With LoadCredential= they don't.
- **Journal hygiene.** `journalctl --user -u pyfars-engine.service` should never print API keys.
  Today, if the engine ever logs `os.environ` (intentionally for debug or accidentally via a raised exception with env in repr), keys leak.
  With LoadCredential= the keys aren't in the env to leak.

## Acceptance

- [ ] `engine-service-spec.md` schema documents `load-credentials:` field with example.
- [ ] `systemd-user/templates/pyfars-engine.service.j2` projects `LoadCredential=` lines from the spec field.
- [ ] `Endpoint.has_credentials` and resolution prefer `$CREDENTIALS_DIRECTORY/<name>` over `os.environ`.
- [ ] Tests: `test_endpoint_credentials_directory_preference.py` covers (a) credentials dir set + file present → reads file, (b) credentials dir set + file absent → falls back to env, (c) credentials dir unset → reads env.
- [ ] On cold-red-gate after migration: `cat /proc/<pyfars-pid>/environ | tr '\0' '\n' | grep API_KEY` returns nothing; `systemctl --user show pyfars-engine.service | grep LoadCredential` lists the directives; endpoint calls (Cerebras, Groq, NVIDIA NIM, HF Router, Mistral) succeed end-to-end.

## Out of scope

- agenix migration.
  That's the producer-side change (where the on-host encrypted file comes from).
  Tracked separately as the 561 polity's `secrets-agenix-migration` task; orthogonal to this consumer-side change.
- Hashicorp Vault / 1Password / cloud secret managers. systemd LoadCredential= is the scoped-and-supported boundary; integrating a remote secret manager is its own task and would consume this same `Endpoint.has_credentials` interface.

## Origin

Captured as task #9 of the 561 polity's audit-substrate-bootstrap project.
The 561-side framing is at `/home/emsenn/561/work/projects/audit-substrate-bootstrap/tasks/secrets-systemd-load-credential.md`; this task is the pyfars-side engineering work that record points at.
