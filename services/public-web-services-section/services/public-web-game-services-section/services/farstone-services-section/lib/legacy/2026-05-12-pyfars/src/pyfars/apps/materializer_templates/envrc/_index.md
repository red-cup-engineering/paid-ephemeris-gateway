---
kind: harness
title: "Direnv environment variables"
type: harness
slug: "harness:envrc"
target-default: ""  # write to polity root
target-runtime: "envrc"
manifest: ".pyfars/harness-manifests/envrc.json"
emits:
  - source: null
    template: "envrc.j2"
    target-pattern: ".envrc"
    mode: aggregate
---
