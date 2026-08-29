# SDK — entity-typed views and the shared tool surface

The SDK is the cross-frame surface bridge between the system frame (cells) and the program frame (typed code).
Each entity class is a *typed view* over substrate cells, hydrated via the single `load_one` / `load_all` path — no parallel persistence shape, no markdown re-parsing.
The shared tool surface is the set of substrate-operation primitives that bridges, harnesses, and scripts all share.

## Entity loader

::: pyfars.sdk.entities._load

## Entities

::: pyfars.sdk.entities.agent

::: pyfars.sdk.entities.assignment

::: pyfars.sdk.entities.channel

::: pyfars.sdk.entities.credential

::: pyfars.sdk.entities.endpoint

::: pyfars.sdk.entities.event

::: pyfars.sdk.entities.federation_envelope

::: pyfars.sdk.entities.harness

::: pyfars.sdk.entities.hook

::: pyfars.sdk.entities.intent

::: pyfars.sdk.entities.jural_relation

::: pyfars.sdk.entities.message

::: pyfars.sdk.entities.office

::: pyfars.sdk.entities.peer

::: pyfars.sdk.entities.prompt

::: pyfars.sdk.entities.session

::: pyfars.sdk.entities.skill

## Tools

::: pyfars.sdk.tools

## Flatfile

::: pyfars.sdk.flatfile
