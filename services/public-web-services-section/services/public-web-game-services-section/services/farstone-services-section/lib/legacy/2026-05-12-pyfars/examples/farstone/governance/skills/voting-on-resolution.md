---
name: "Voting on resolution"
description: "Records a council member's vote on an open resolution and updates the resolution's tally. Use when the council is in regular or emergency session and a resolution is on the floor."
---


## Requirements

- A resolution record in `governance/decisions/<resolution-slug>.md` with `status: open`
- Quorum present (3 of 5 members) per Charter Article III §1
- The voting agent serves the city-council office

## Steps

1. Read the resolution text and any amendments offered.
2. Cast the vote: `aye`, `nay`, or `abstain`.
3. Update the resolution record's `votes:` map with `<member-slug>: <vote>`.
4. If the vote completes the tally (all 5 members or quorum + abstentions reaching deadline), set `status: passed` (3+ ayes), `status: failed` (3+ nays), or `status: deferred`.

## Outcomes

The resolution's `votes:` map gains an entry.
If the tally completes, the resolution's status updates accordingly.
A passed resolution becomes effective when signed by the mayor (or when the 10-day veto window expires unsigned).
