# Koios News Service Section

This settlement supplies warrant-preserving news-domain services that any
publication may hire. It is not the `koios.news` masthead and does not own that
publication's corpus, editorial voice, beat portfolio, attention policy,
advertising, URLs, publication approval, or delivery authority. `koios.news`
is its first customer and proving ground, not the boundary of its mission.

The Service Section has one executable ActivityStreams message boundary:

```sh
npm run describe
printf '%s\n' "$ACTIVITY" | npm run settle -- 2026-07-18T18:00:00.000Z
```

`describe` advertises only operations the settlement can actually perform.
`settle` routes one exact solicitation or accepted contract to the owning
operation, records the result in the provider's append-only event log, and
returns the first durable response when a watcher replays the same message.
It does not discover providers or schedule work for a customer publication.

The Section now advertises a two-stage evidence spine. Its admissible research
packet service composes two separately contracted provider results without
reading or writing either provider's or customer's territory:

```text
Newscable SourceBundleDelivery + Corpus Management recovery/projection
  -> fresh current-source claims + digest-bound prior-research context
  |  typed refusal before prose or unlicensed corpus inference
```

Current-provider claims may enter the evidence cut. Recovered prior research
remains contextual reporting leads until separately sourced; the service never
promotes old notes into present-tense newsroom facts. The customer must name
the exact primary-source URLs because primary-source classification is an
editorial judgment, not something the provider infers from URL rank.

The licensed editorial state service then measures what that packet can
faithfully sustain before prose is commissioned:

```text
assignment + admitted research packet + genre law
  -> source-bound assertions + licensed passage plan
  |  typed refusal before writer inference
```

Both operations intentionally perform no generative inference. They preserve
source assertions as attributed evidence and construct the record
deterministically. A writer may consume the resulting bounded brief to produce
prose; a separately authorized editor still decides whether the exact
manuscript may be published.
