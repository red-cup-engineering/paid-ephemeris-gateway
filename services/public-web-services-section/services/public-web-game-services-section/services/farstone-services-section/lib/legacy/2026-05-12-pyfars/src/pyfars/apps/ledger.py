"""Transaction lens over the witness event-log.

Realizes the captain-planned `transactional-record-infrastructure` plan
(`tri-transaction-predicate-format`, `tri-detailed-balance-check`) and
the `lens-entity-system` plan's `les-transaction-lens-entity` task.

The PAM principle "the witness IS the answer" applies here: the
event-log already records every operator invocation as a Witness; we do
not build a parallel transaction substrate. We *lens* each witness as
a double-entry posting against the substrate's chart-of-accounts.

A posting is the four-tuple the captain's chart-of-accounts wants
(per `operations/.../accounting/texts/chart-of-accounts.md`):

  (debit-account, credit-account, amount, commodity)

plus a back-reference to the originating witness (target + timestamp +
operator). Detailed balance — debits = credits per account at
stationarity — is the operations-loop's signature of having reached
fixed-point (per the operations-loop goal-doc, the σ/Δ math grounding).

The projection from witness → posting(s) is a *binding*. The default
binding handles the operators FARS currently emits (`commit`, `fm_*`,
`move`, `insertion`, `retraction`). It is overridable via
`.fars/ledger.toml`'s `[bindings]` table:

    [bindings.commit]
    on = "diff_entities_drafted"
    debit = "assets:knowledge:library"
    credit = "equity:capability"
    commodity = "ARTIFACTS"

— meaning: each entry in the witness's `details["diff_entities_drafted"]`
list produces one posting that debits library, credits capability, in
ARTIFACTS.
"""
from __future__ import annotations

import tomllib
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Iterator, Mapping

from pyfars.kernel.witness import Witness


@dataclass(frozen=True)
class Posting:
    """One lensed double-entry posting against the chart-of-accounts.

    A single witness may produce zero, one, or many postings depending
    on its operator and the binding's `on` selector.

    Fields:
      debit: account path debited (e.g. "assets:knowledge:library").
      credit: account path credited.
      amount: signed magnitude (always positive in a posting; sign is
        carried by the debit/credit role).
      commodity: unit of measure (TOKENS, TASKS, ARTIFACTS, USD, ...).
      witness_target: the witness's `target` (file path or sha).
      witness_op: the witness's operator name.
      witness_ts: the witness's timestamp.
      memo: short human-readable description.
    """
    debit: str
    credit: str
    amount: float
    commodity: str
    witness_target: str
    witness_op: str
    witness_ts: str
    memo: str = ""
    # Routing predicates carried through from the source witness (PAM
    # channels + LPMud origin pattern). Optional so older witnesses
    # without these fields still project cleanly.
    witness_channel: str | None = None
    witness_origin: str | None = None
    # Bilattice axes carried through from the source witness (PAM
    # predication-algebra-model truth × knowledge bilattice). Defaults
    # 1.0 mean "fully-true, fully-evidenced" — the classical case.
    witness_truth: float = 1.0
    witness_evidence: float = 1.0

    def effective_amount(self, weight_by: str | None = None) -> float:
        """Amount scaled by the requested bilattice weight.

        ``None``: classical (raw amount, no weighting).
        ``"truth"``: amount × truth.
        ``"evidence"``: amount × evidence.
        ``"k_meet"``: amount × min(truth, evidence) — bilattice
            knowledge-meet, the conservative joint reading.
        """
        if weight_by is None:
            return self.amount
        if weight_by == "truth":
            return self.amount * self.witness_truth
        if weight_by == "evidence":
            return self.amount * self.witness_evidence
        if weight_by == "k_meet":
            # Conservative cross-axis projection: scale by the weaker
            # of (truth, evidence). NOT the formal bilattice meet — a
            # heuristic projection that yields the most cautious
            # reading. Useful as a "if either belief is weak, dampen
            # the posting" rule of thumb.
            return self.amount * min(self.witness_truth, self.witness_evidence)
        raise ValueError(
            f"unknown weight_by={weight_by!r}; expected None, 'truth', "
            f"'evidence', or 'k_meet'"
        )

    def to_dict(self) -> dict:
        return {
            "debit": self.debit,
            "credit": self.credit,
            "amount": self.amount,
            "commodity": self.commodity,
            "witness": {
                "target": self.witness_target,
                "op": self.witness_op,
                "ts": self.witness_ts,
                "channel": self.witness_channel,
                "origin": self.witness_origin,
                "truth": self.witness_truth,
                "evidence": self.witness_evidence,
            },
            "memo": self.memo,
        }


@dataclass(frozen=True)
class Binding:
    """A rule mapping one operator's witnesses to postings.

    `on` selects what to count from the witness's `details`:
      - None / "_one_": one posting per witness, amount = 1.
      - a string key whose value is a list: one posting per list entry,
        amount = 1 each (e.g. on="diff_entities_drafted").
      - a string key whose value is a number: one posting, amount=value.

    `commodity` is constant per binding.
    """
    operator: str
    debit: str
    credit: str
    commodity: str
    on: str | None = None
    memo: str = ""


# ---------- defaults -------------------------------------------------------

# Sane defaults covering operators FARS currently emits. These mirror
# the chart-of-accounts.md categories the captain already drafted and
# keep the plan-tasks honest: every kind of witness has *some* posting,
# so detailed-balance is computable without per-repo configuration.
#
# Convention used here:
#   - drafting an entity: debit assets:knowledge:library (we *added* an
#     artifact), credit equity:capability (capability spent producing it).
#   - refining an entity: debit assets:knowledge:library (still gained
#     value), credit equity:settlement (settlement-increment "paid").
#   - drafting a task: debit assets:work:tasks-ready (ready-queue grew),
#     credit equity:plan (planning capacity spent).
#   - any frontmatter mutation: debit assets:knowledge:library, credit
#     equity:capability (one ARTIFACT-edit unit).
#   - moves/insertions/retractions of records: same shape, one unit each.
#
# Captains who want a richer chart override via `.fars/ledger.toml`.
DEFAULT_BINDINGS: tuple[Binding, ...] = (
    Binding(
        operator="commit",
        on="diff_entities_drafted",
        debit="assets:knowledge:library",
        credit="equity:capability",
        commodity="ARTIFACTS",
        memo="entity drafted",
    ),
    Binding(
        operator="commit",
        on="diff_entities_refined",
        debit="assets:knowledge:library",
        credit="equity:settlement",
        commodity="ARTIFACTS",
        memo="entity refined",
    ),
    Binding(
        operator="commit",
        on="diff_tasks_drafted",
        debit="assets:work:tasks-ready",
        credit="equity:plan",
        commodity="TASKS",
        memo="task drafted",
    ),
    Binding(
        operator="fm_add",
        debit="assets:knowledge:library",
        credit="equity:capability",
        commodity="ARTIFACTS",
        memo="frontmatter-add",
    ),
    Binding(
        operator="fm_set",
        debit="assets:knowledge:library",
        credit="equity:capability",
        commodity="ARTIFACTS",
        memo="frontmatter-set",
    ),
    Binding(
        operator="fm_remove",
        debit="equity:capability",
        credit="assets:knowledge:library",
        commodity="ARTIFACTS",
        memo="frontmatter-remove",
    ),
    Binding(
        operator="insertion",
        debit="assets:knowledge:library",
        credit="equity:capability",
        commodity="ARTIFACTS",
        memo="record inserted",
    ),
    Binding(
        operator="retraction",
        debit="equity:capability",
        credit="assets:knowledge:library",
        commodity="ARTIFACTS",
        memo="record retracted",
    ),
    Binding(
        operator="relocation",
        debit="assets:knowledge:library",
        credit="assets:knowledge:library",
        commodity="ARTIFACTS",
        memo="record relocated",
    ),
    # Failure-diagnosis (Reflexion + AOP failure-diagnosis concept).
    # Diagnosing a failure has a real cost — it consumed agent
    # capability — and produces a learning artifact (the diagnosis
    # itself). Booked as expenses:diagnosis ← equity:capability so
    # captains can read the cost-of-diagnosis directly off the ledger.
    Binding(
        operator="diagnose",
        debit="expenses:diagnosis",
        credit="equity:capability",
        commodity="DIAGNOSES",
        memo="failure diagnosed",
    ),
    # Lesson distillation (AOP learning concept's continuous loop:
    # observation → instinct → skill → tool). A lesson IS an asset:
    # the substrate accumulated knowledge by paying with learning
    # capacity. The bilattice's evidence axis carries lesson strength.
    Binding(
        operator="lesson",
        debit="assets:knowledge:lessons",
        credit="equity:learning",
        commodity="LESSONS",
        memo="lesson distilled",
    ),
)


def propose_binding(operator: str, count: int = 0) -> str:
    """Emit a TOML binding stub for an unmapped operator.

    The learning loop's first move (per the AOP `learning` concept and
    `instinct-record` pattern): when coverage shows an operator with no
    binding, suggest one — placeholder accounts and commodity, but the
    captain only has to fill in the chart-of-accounts assignment, not
    rediscover the binding shape.
    """
    note = f"# Auto-proposed by `pyfars ledger coverage --propose-binding`\n"
    if count:
        note += f"# {count} witness(es) of operator `{operator}` were unmapped.\n"
    return (
        note
        + f"[bindings.{operator}]\n"
        f'operator = "{operator}"\n'
        f'# on = "<key in details whose value to count>"  # optional\n'
        f'debit  = "assets:TODO"   # account this operator adds value to\n'
        f'credit = "equity:TODO"   # account capacity is spent from\n'
        f'commodity = "TODO"\n'
        f'memo = "{operator}"\n'
    )


def load_bindings(ledger_toml: Path | None) -> tuple[Binding, ...]:
    """Load bindings from `.fars/ledger.toml`, falling back to defaults.

    The file format is one TOML table per binding under `[bindings]`:

        [bindings.commit-drafted]
        operator = "commit"
        on = "diff_entities_drafted"
        debit = "assets:knowledge:library"
        credit = "equity:capability"
        commodity = "ARTIFACTS"
        memo = "entity drafted"

    If the file is absent or has no `[bindings]` table, the defaults
    are returned unchanged. If it has a `[bindings]` table, its
    contents *replace* the defaults (full override; no merge surprises).
    """
    if ledger_toml is None or not ledger_toml.is_file():
        return DEFAULT_BINDINGS
    data = tomllib.loads(ledger_toml.read_text(encoding="utf-8"))
    table = data.get("bindings")
    if not isinstance(table, dict) or not table:
        return DEFAULT_BINDINGS
    out: list[Binding] = []
    for _name, spec in table.items():
        if not isinstance(spec, dict):
            continue
        try:
            out.append(Binding(
                operator=str(spec["operator"]),
                debit=str(spec["debit"]),
                credit=str(spec["credit"]),
                commodity=str(spec.get("commodity", "ARTIFACTS")),
                on=spec.get("on"),
                memo=str(spec.get("memo", "")),
            ))
        except KeyError:
            continue
    return tuple(out) if out else DEFAULT_BINDINGS


# ---------- continuous-learning closure -----------------------------------

def existing_lesson_strengths(witnesses: Iterable[Witness]
                              ) -> dict[str, int]:
    """Return the maximum evidence_count already-recorded per pattern.

    A lesson witness in the log carries `details["pattern"]` and
    `details["evidence_count"]`. We index by pattern → max count seen
    so callers (e.g. `derive_lessons`) can skip re-emitting lessons
    whose backing the log already documents at equal-or-greater
    strength. Idempotency lever for the continuous-learning loop.
    """
    out: dict[str, int] = {}
    for w in witnesses:
        if w.operator != "lesson":
            continue
        pat = w.details.get("pattern")
        cnt = int(w.details.get("evidence_count", 0))
        if not isinstance(pat, str):
            continue
        if cnt > out.get(pat, -1):
            out[pat] = cnt
    return out


def derive_failure_cluster_lessons(
        witnesses: Iterable[Witness],
        *, threshold: int = 3,
        ) -> list[Witness]:
    """Distill lessons from recurring failure-diagnosis clusters.

    Each ``diagnose`` witness carries ``details["failed_operator"]``
    and ``details["diagnosed_cause"]`` (per
    ``make_diagnosis_witness``). When the same (failed_operator,
    cause) pair recurs at least ``threshold`` times, the substrate
    has crossed the line from "this happened once" to "this is a
    pattern" — exactly the AOP `learning` concept's
    observation→instinct boundary, applied to failure rather than to
    coverage gaps. Each cluster becomes a lesson on the `learning`
    channel; the bilattice ``evidence`` axis tracks confirmation
    count via ``make_lesson_witness``.

    Source witnesses (timestamps) are carried on the lesson so the
    captain can trace each cluster back to its constituent diagnoses.
    """
    from pyfars.kernel.witness import make_lesson_witness  # avoid cycle
    clusters: dict[tuple[str, str], list[str]] = defaultdict(list)
    for w in witnesses:
        if w.operator != "diagnose":
            continue
        d = w.details or {}
        failed = d.get("failed_operator")
        cause = d.get("diagnosed_cause")
        if not isinstance(failed, str) or not isinstance(cause, str):
            continue
        clusters[(failed, cause)].append(w.timestamp)
    out: list[Witness] = []
    for (failed, cause), timestamps in clusters.items():
        if len(timestamps) < threshold:
            continue
        pattern = f"failure-cluster:{failed}:{cause}"
        out.append(make_lesson_witness(
            pattern=pattern,
            suggested_action=(
                f"operator `{failed}` has failed {len(timestamps)} times "
                f"with cause `{cause}`; consider a guard, a precondition "
                f"check, or a substrate-level fix that eliminates this "
                f"failure mode at its source"
            ),
            evidence_count=len(timestamps),
            source_witnesses=sorted(timestamps),
        ))
    return out


def derive_stationarity_leak_lessons(
        witnesses: Iterable[Witness],
        bindings: Iterable[Binding] = DEFAULT_BINDINGS,
        closure_accounts: Mapping[str, set[str]] | None = None,
        *, threshold: int = 3,
        ) -> list[Witness]:
    """Distill lessons from declared closure accounts that fail to close.

    A *closure account* is one the captain has contracted (via the
    ``[closure-accounts]`` table) to drain to zero at stationarity —
    e.g. ``assets:work:tasks-ready`` should be cleared by completions
    matching its drafts. When such an account accumulates an
    imbalance whose magnitude crosses ``threshold`` units, the
    operations loop has not reached fixed-point in that channel:
    work entered the stage and never closed out. That stalled-stage
    pattern becomes a lesson.

    Critical guard: this family ONLY fires for accounts the captain
    has EXPLICITLY listed in ``closure_accounts``. The strict
    default (treating every account as closure when no declaration
    exists) is appropriate for ``detailed_balance``'s diagnostic
    output — fail loud — but would carpet-bomb meaningless lessons
    here, since stock accounts like ``assets:knowledge:library`` are
    *expected* to grow without bound. A lesson must be a real signal,
    not noise; only a contractually-declared leak qualifies.

    Evidence count is ``floor(abs(net))`` — each unit of leaked work
    is one unit of confirmation that the leak is real.
    """
    from pyfars.kernel.witness import make_lesson_witness  # avoid cycle
    if not closure_accounts:
        return []
    bindings = tuple(bindings)
    postings = list(project_all(witnesses, bindings))
    balances = tally(postings)
    out: list[Witness] = []
    for (account, commodity), bal in balances.items():
        declared = closure_accounts.get(commodity)
        if declared is None or account not in declared:
            continue
        net = bal.balance
        leaked = int(abs(net))
        if leaked < threshold:
            continue
        direction = "debit" if net > 0 else "credit"
        pattern = f"stationarity-leak:{commodity}:{account}"
        out.append(make_lesson_witness(
            pattern=pattern,
            suggested_action=(
                f"closure account `{account}` ({commodity}) carries a "
                f"net {direction} balance of {abs(net):.2f}; either the "
                f"counter-flow operator is missing/misbound, or this "
                f"account should be reclassified as a stock — see "
                f"`pyfars ledger balance --commodity {commodity}`"
            ),
            evidence_count=leaked,
        ))
    return out


def derive_all_lessons(witnesses: Iterable[Witness],
                       bindings: Iterable[Binding] = DEFAULT_BINDINGS,
                       closure_accounts: Mapping[str, set[str]] | None = None,
                       *, threshold: int = 3,
                       ) -> list[Witness]:
    """Run every lesson-derivation family and return the union.

    The continuous-learning closure's composition point: each derive_*
    function captures one pattern shape (unmapped operators, recurring
    failure clusters, stalled closure accounts); this wrapper runs
    them all against the same window and returns the concatenated
    candidate list. Idempotency is left to the caller — every lesson
    is keyed by its ``pattern`` string, so
    ``existing_lesson_strengths`` filters any family uniformly.

    Listed in the order new patterns join the substrate's vocabulary,
    not by importance — captains who care about ordering should
    re-sort by ``evidence`` axis at consumption time.
    """
    witnesses = list(witnesses)
    out: list[Witness] = []
    out.extend(derive_lessons(witnesses, bindings,
                              threshold=threshold, skip_existing=False))
    out.extend(derive_failure_cluster_lessons(witnesses, threshold=threshold))
    out.extend(derive_stationarity_leak_lessons(
        witnesses, bindings, closure_accounts, threshold=threshold))
    return out


def derive_lessons(witnesses: Iterable[Witness],
                   bindings: Iterable[Binding] = DEFAULT_BINDINGS,
                   *, threshold: int = 3,
                   skip_existing: bool = True,
                   ) -> list[Witness]:
    """Distill lessons from recurring unmapped operators.

    The AOP learning concept's first move: observation crystallizes
    into instinct after N confirmations. We read the witness stream,
    compute coverage, and for every operator with at least
    ``threshold`` unmapped witnesses we emit a ``lesson`` witness
    suggesting the operator deserves a binding. Each lesson's
    ``evidence`` axis (PAM bilattice knowledge-degree) is set from
    the observation count via ``make_lesson_witness``, so consumers
    can rank lessons by backing strength.

    The lessons themselves are *not* appended to the event log here —
    callers (CLI ``pyfars ledger learn``) decide whether to record them.
    When ``skip_existing`` is True (default), patterns already
    documented in the log at equal-or-higher evidence_count are
    skipped, so re-running ``learn --record`` on an unchanged log is a
    no-op (idempotency of the continuous-learning loop). Pass
    ``skip_existing=False`` to force regeneration regardless.
    """
    from pyfars.kernel.witness import make_lesson_witness  # avoid cycle
    witnesses = list(witnesses)
    already = existing_lesson_strengths(witnesses) if skip_existing else {}
    cov = coverage(iter(witnesses), bindings)
    out: list[Witness] = []
    for op, count in cov.unmapped_operators:
        if count < threshold:
            continue
        pattern = f"unmapped-operator:{op}"
        if already.get(pattern, -1) >= count:
            continue
        out.append(make_lesson_witness(
            pattern=pattern,
            suggested_action=(
                f"add a binding for operator `{op}` to .fars/ledger.toml; "
                f"see `pyfars ledger coverage --propose-binding {op}`"
            ),
            evidence_count=count,
        ))
    return out


# ---------- projection -----------------------------------------------------

def _amount_from(witness: Witness, on: str | None) -> float:
    """How much the binding's `on` selector says this witness counts as."""
    if on is None or on == "_one_":
        return 1.0
    val = (witness.details or {}).get(on)
    if val is None:
        return 0.0
    if isinstance(val, list):
        return float(len(val))
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        return 1.0 if val else 0.0
    return 0.0


def project(witness: Witness,
            bindings: Iterable[Binding] = DEFAULT_BINDINGS) -> list[Posting]:
    """Lens one witness as zero or more postings.

    Iterates every binding whose `operator` matches; emits a posting
    for each non-zero amount. A single witness may map to several
    postings if multiple bindings match it (e.g. a `commit` witness
    that both drafts entities and drafts tasks).
    """
    postings: list[Posting] = []
    for b in bindings:
        if b.operator != witness.operator:
            continue
        amount = _amount_from(witness, b.on)
        if amount == 0:
            continue
        postings.append(Posting(
            debit=b.debit,
            credit=b.credit,
            amount=amount,
            commodity=b.commodity,
            witness_target=witness.target,
            witness_op=witness.operator,
            witness_ts=witness.timestamp,
            memo=b.memo,
            witness_channel=witness.channel,
            witness_origin=witness.origin,
            witness_truth=witness.truth,
            witness_evidence=witness.evidence,
        ))
    return postings


def witnesses_as_of(witnesses: Iterable[Witness],
                    as_of: str | None) -> Iterator[Witness]:
    """Yield only witnesses whose timestamp ≤ as_of (lex compare).

    The temporal lens (PAM replay-with-cutoff): rewind the event log
    to the moment ``as_of`` and view the substrate as it was. ISO-8601
    UTC timestamps sort lexicographically as long as they share the
    same precision and timezone marker, which ``now_iso`` guarantees.
    """
    if as_of is None:
        for w in witnesses:
            yield w
        return
    for w in witnesses:
        if w.timestamp and w.timestamp <= as_of:
            yield w


def filter_postings(postings: Iterable[Posting], *,
                    channel: str | None = None,
                    origin: str | None = None,
                    operator: str | None = None,
                    commodity: str | None = None,
                    min_truth: float | None = None,
                    min_evidence: float | None = None,
                    ) -> Iterator[Posting]:
    """Filter postings by routing predicates.

    Each predicate is an exact-match equality test; ``None`` means
    "don't filter on this dimension." Per the FARS messaging-and-events
    analysis, channel and origin together turn the event-log from a
    flat stream into a routable surface — the ledger lens inherits
    that routability.
    """
    for p in postings:
        if channel is not None and p.witness_channel != channel:
            continue
        if origin is not None and p.witness_origin != origin:
            continue
        if operator is not None and p.witness_op != operator:
            continue
        if commodity is not None and p.commodity != commodity:
            continue
        if min_truth is not None and p.witness_truth < min_truth:
            continue
        if min_evidence is not None and p.witness_evidence < min_evidence:
            continue
        yield p


def project_all(witnesses: Iterable[Witness],
                bindings: Iterable[Binding] = DEFAULT_BINDINGS
                ) -> Iterator[Posting]:
    """Stream postings projected from a witness sequence."""
    bindings = tuple(bindings)
    for w in witnesses:
        yield from project(w, bindings)


# ---------- aggregation ----------------------------------------------------

@dataclass
class AccountBalance:
    """Running totals for one (account, commodity) pair."""
    account: str
    commodity: str
    debits: float = 0.0
    credits: float = 0.0

    @property
    def balance(self) -> float:
        """Debit-side balance: positive = net debit, negative = net credit.

        For asset/expense accounts a positive balance is the natural
        direction; for liability/equity/income a negative balance is
        natural. Detailed-balance at stationarity says the *system-wide*
        sum across all accounts is zero — which `detailed_balance()`
        checks — not that any one account zeroes out.
        """
        return self.debits - self.credits


def tally(postings: Iterable[Posting],
          *, weight_by: str | None = None,
          ) -> dict[tuple[str, str], AccountBalance]:
    """Sum debits and credits per (account, commodity).

    Returns a dict keyed by `(account, commodity)` so accounts denominated
    in different commodities don't get mistakenly summed (TOKENS and
    ARTIFACTS are not addable).

    ``weight_by`` selects a bilattice weighting (None = classical
    raw-amount sum; ``"truth"`` / ``"evidence"`` / ``"k_meet"`` scale
    each posting's amount by the corresponding bilattice axis from
    its source witness — see ``Posting.effective_amount``).
    """
    out: dict[tuple[str, str], AccountBalance] = {}
    for p in postings:
        amount = p.effective_amount(weight_by)
        for side, role in ((p.debit, "debit"), (p.credit, "credit")):
            key = (side, p.commodity)
            bal = out.get(key)
            if bal is None:
                bal = AccountBalance(account=side, commodity=p.commodity)
                out[key] = bal
            if role == "debit":
                bal.debits += amount
            else:
                bal.credits += amount
    return out


@dataclass(frozen=True)
class AccountFlow:
    """Per-account net flow under detailed-balance.

    `net` is debits-minus-credits. For an account the captain has
    declared a *closure account* (a stage of the operations loop that
    is supposed to zero out at stationarity — e.g. `assets:work:tasks-
    ready` should be drained by completions matching its drafts), a
    non-zero `net` IS the leak: drafts entered the stage and never
    closed out.

    For accounts NOT in the closure set (capital stocks like
    `assets:knowledge:library` that are allowed to accumulate), net is
    informational, not diagnostic.
    """
    account: str
    commodity: str
    debits: float
    credits: float
    net: float
    is_closure_account: bool
    closed: bool


@dataclass(frozen=True)
class BalanceCheck:
    """Result of a per-commodity detailed-balance check.

    The check is per-account, per-commodity. `balanced` is True iff
    every *closure account* in this commodity has net within
    `tolerance`. Capital-stock accounts (not in the closure set) may
    carry any balance; their net is reported but does not gate
    `balanced`.

    If the captain has declared no closure accounts for a commodity,
    the strict default applies: every account in that commodity must
    close. This is intentional — silent unconfigured commodities
    should fail loud rather than silently pass.
    """
    commodity: str
    tolerance: float
    balanced: bool
    flows: tuple[AccountFlow, ...]
    """All accounts in this commodity, sorted by |net| descending."""

    @property
    def total_debits(self) -> float:
        return sum(f.debits for f in self.flows)

    @property
    def total_credits(self) -> float:
        return sum(f.credits for f in self.flows)

    @property
    def imbalance_by_account(self) -> tuple[tuple[str, float], ...]:
        return tuple((f.account, f.net) for f in self.flows
                     if not f.closed)


@dataclass(frozen=True)
class Coverage:
    """How much of the witness stream the binding set actually projects.

    A high `unmapped_witnesses` count means many operators are emitting
    witnesses that no binding catches — those changes show up in the
    event-log but not in the ledger, so a "balanced" report is lying
    about coverage. Captains should keep `unmapped_witnesses` near
    zero or accept that the lens is partial.
    """
    total_witnesses: int
    projected_witnesses: int
    unmapped_witnesses: int
    unmapped_operators: tuple[tuple[str, int], ...]
    """(operator, count) for operators with no binding match, by count desc."""


def coverage(witnesses: Iterable[Witness],
             bindings: Iterable[Binding] = DEFAULT_BINDINGS) -> Coverage:
    """Compute binding coverage over a witness stream."""
    bindings = tuple(bindings)
    bound_ops = {b.operator for b in bindings}
    total = 0
    projected = 0
    unmapped: dict[str, int] = defaultdict(int)
    for w in witnesses:
        total += 1
        # A witness is "projected" if at least one binding emits ≥1 posting.
        # Cheap path: operator is bound and at least one matching binding's
        # selector returns non-zero amount.
        if w.operator not in bound_ops:
            unmapped[w.operator] += 1
            continue
        any_amount = False
        for b in bindings:
            if b.operator != w.operator:
                continue
            if _amount_from(w, b.on) > 0:
                any_amount = True
                break
        if any_amount:
            projected += 1
        else:
            unmapped[w.operator] += 1
    by_count = tuple(sorted(unmapped.items(), key=lambda kv: -kv[1]))
    return Coverage(
        total_witnesses=total,
        projected_witnesses=projected,
        unmapped_witnesses=total - projected,
        unmapped_operators=by_count,
    )


def _load_closure_accounts(ledger_toml: Path | None) -> dict[str, set[str]]:
    """Load `[closure-accounts]` table: {commodity: {account, ...}}.

    Format:
        [closure-accounts]
        TASKS = ["assets:work:tasks-ready"]
        ARTIFACTS = []  # explicitly say "no closure accounts in this commodity"

    Returns `{}` if the file or table is absent — the strict default
    (every account must close) then applies in `detailed_balance`.
    """
    if ledger_toml is None or not ledger_toml.is_file():
        return {}
    data = tomllib.loads(ledger_toml.read_text(encoding="utf-8"))
    table = data.get("closure-accounts")
    if not isinstance(table, dict):
        return {}
    out: dict[str, set[str]] = {}
    for commodity, accts in table.items():
        if isinstance(accts, list):
            out[str(commodity)] = {str(a) for a in accts}
    return out


def detailed_balance(postings: Iterable[Posting],
                     closure_accounts: Mapping[str, set[str]] | None = None,
                     tolerance: float = 1e-9,
                     *, weight_by: str | None = None,
                     ) -> dict[str, BalanceCheck]:
    """Per-commodity, per-account detailed-balance check.

    For each commodity, compute every account's net flow
    (debits - credits). Decide whether each account "should close":
      - If `closure_accounts` declares the commodity, only the listed
        accounts are closure accounts; the rest are stocks allowed to
        accumulate.
      - If `closure_accounts` does NOT declare the commodity (None or
        not in the mapping), the strict default applies: *every*
        account in that commodity is treated as a closure account.

    The commodity is `balanced` iff every closure account is at zero
    within tolerance. Capital-stock accounts' nets are reported but
    do not gate the verdict.

    This is non-tautological: stage accounts where work enters
    (drafted → ready) accumulate debits; if no matching credits arrive
    (completions never happened), net stays positive and the check
    fails — exactly the operational signal the captain's
    `tri-detailed-balance-check` asks for.
    """
    by_commodity: dict[str, list[AccountBalance]] = defaultdict(list)
    for (_acct, comm), bal in tally(postings, weight_by=weight_by).items():
        by_commodity[comm].append(bal)

    closure_accounts = dict(closure_accounts or {})
    out: dict[str, BalanceCheck] = {}
    for commodity, balances in by_commodity.items():
        commodity_closure = closure_accounts.get(commodity)
        flows: list[AccountFlow] = []
        all_closed = True
        for b in balances:
            is_closure = (b.account in commodity_closure
                          if commodity_closure is not None
                          else True)  # strict default
            closed = (not is_closure) or abs(b.balance) <= tolerance
            if is_closure and not closed:
                all_closed = False
            flows.append(AccountFlow(
                account=b.account,
                commodity=commodity,
                debits=b.debits,
                credits=b.credits,
                net=b.balance,
                is_closure_account=is_closure,
                closed=closed,
            ))
        flows.sort(key=lambda f: -abs(f.net))
        out[commodity] = BalanceCheck(
            commodity=commodity,
            tolerance=tolerance,
            balanced=all_closed,
            flows=tuple(flows),
        )
    return out
