---
title: "Read substrate records for implementation context"
type: jural-relation
kind: privilege
active-holder: pyfars-developer
passive-party: pyfars-substrate
scope-action: read-any-substrate-record-for-implementation
correlate-of: no-right
theory-basis: [jural-relation, normative-operational-layering]
---


The developer may read any record in the substrate — theory records, governance records, work records — to understand implementation context.
This privilege is narrower in intent than the XO's `read-any-substrate-record` (which covers operational routing) but equally broad in scope: both are read privileges with `no-right` correlates.

The developer's read privilege is grounded in the `derive-from-theory-before-planning` duty: reading the theory corpus to understand what the implementation guide's `theory-basis:` citations mean is a precondition on sound implementation.
Restricting this reading would make the duty's required-action impossible.

## Difference from XO's read privilege

The XO reads broadly to route work.
The developer reads broadly to understand what it is implementing.
The motivating need is different; the substrate privilege structure is the same.
Both are Hohfeldian privileges with the substrate in the passive position.

## No write corollary

This privilege does not imply write access to any record outside `src/`.
The developer reads widely; writes narrowly.
Finding a theory record that appears incorrect while reading for implementation context is handled by filing a triage note through the XO intake, not by directly modifying the theory record.
