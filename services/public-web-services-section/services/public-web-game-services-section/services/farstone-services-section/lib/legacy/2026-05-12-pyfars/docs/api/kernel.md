# Kernel — system-frame primitives

The kernel realizes the *system frame*: cells, closure, queries, witnesses, and the operators that take the store from one state to the next.
Nothing in `pyfars.kernel` walks the filesystem — directory work belongs to `LoadDirectoryProgram` and the materializer programs.

## Store

::: pyfars.kernel.store

## Query

::: pyfars.kernel.query

## Witness

::: pyfars.kernel.witness

## Event Log

::: pyfars.kernel.event_log

## Closure

::: pyfars.kernel.closure

## Projector

::: pyfars.kernel.projector.compound

::: pyfars.kernel.projector.markdown_frontmatter

::: pyfars.kernel.projector.markdown_body

::: pyfars.kernel.projector.yaml_doc

::: pyfars.kernel.projector.json_doc

::: pyfars.kernel.projector.python_source

::: pyfars.kernel.projector.ledger

## Operators — edits

::: pyfars.kernel.operator.edit.fm_set

::: pyfars.kernel.operator.edit.fm_add

::: pyfars.kernel.operator.edit.fm_rm

::: pyfars.kernel.operator.edit.rewrite_fm

::: pyfars.kernel.operator.edit.rename_fm_key

::: pyfars.kernel.operator.edit.rewrite_fm_slug

::: pyfars.kernel.operator.edit.rewrite_body_link

::: pyfars.kernel.operator.edit.snapshot

## Operators — authorization

::: pyfars.kernel.operator.auth.check_authorization

::: pyfars.kernel.operator.auth.compute_working_fiber

::: pyfars.kernel.operator.auth.verify

## Operators — federation & kind

::: pyfars.kernel.operator.federation

::: pyfars.kernel.operator.kind

::: pyfars.kernel.operator.insertion

::: pyfars.kernel.operator.retraction

::: pyfars.kernel.operator.relocation

## Traversal

::: pyfars.kernel.traversal.ancestors

::: pyfars.kernel.traversal.descendants

::: pyfars.kernel.traversal.topo_sort

::: pyfars.kernel.traversal.cycles

::: pyfars.kernel.traversal.foundation_distance

::: pyfars.kernel.traversal.descendant_counts
