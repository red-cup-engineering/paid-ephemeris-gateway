"""System-driven closure-rule registry and applicator.

The polity authors closure rules into the system as ``objects/<slug>.md`` records of
``type: closure-rule-record``. This module discovers those records,
lowers each into one or more grounded :class:`StoreRule`s, and applies
the resulting closure to a :class:`PredicationStore` via
:class:`StoreClosureRuleSystem`.

Two rule shapes are supported (see ``objects/rule-record.md``):

1. **Inline ``rule:`` block.** A fully-explicit fiber-closure-rule —
   uniform, expressible as a positive Boolean formula over cell atoms.
   Loaded via :func:`pyfars.kernel.rule_language.parse_rule_record`
   and grounded via :func:`pypredcalc.ground_rule`. Used for alias-
   normalization and other per-cell propagations.

2. **Named ``shape:`` reference.** The record declares a shape name
   (``subset-cover-positive``, ``disqualification-negative``,
   ``subscription-arrival``, ``selection-by-load``) and carries
   parameters as additional frontmatter cells. The named-shape
   instantiator reads its params from the store and emits
   :class:`StoreRule` lists. Used for patterns whose grounding depends
   on store content (subset-cover and disqualification cannot be
   expressed as positive Boolean rules).

The runtime carries no hardcoded rule list — every active rule is a
system-resident record. Removing the record deactivates the rule.
"""
from __future__ import annotations

from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

from pypredcalc import (
    BilatticeValue,
    StoreClosureRuleSystem,
    StoreRule,
    ground_rule,
)
from pypredcalc.predication import (
    And,
    CellAtom,
    FiberClosureRule,
    Or,
    PredicationStore,
)

from pyfars.kernel import query

# ---- inline-rule loader (folded from rule_language) ----------------

import re
from dataclasses import dataclass
from typing import Any
import yaml

_THRESHOLD: dict[str, tuple[int, int]] = {
    "T": (1, 0),
    "F": (0, 1),
    "BOT": (0, 0),
    "TOP": (1, 1),
}


class RuleLanguageError(Exception):
    """Raised when a ``rule:`` block fails to parse or lower."""


@dataclass(frozen=True)
class LoadedRule:
    """A rule plus its slug and a few load-time metadata cells."""
    slug: str
    rule: FiberClosureRule


# ---- public entry points -------------------------------------------------


def parse_rule_block(block: dict[str, Any]) -> FiberClosureRule:
    """Lower a parsed ``rule:`` dict to a :class:`FiberClosureRule`."""
    if not isinstance(block, dict):
        raise RuleLanguageError(
            f"rule: must be a YAML mapping, got {type(block).__name__}"
        )
    free_vars = tuple(block.get("free-vars", ()) or ())
    forall_vars = tuple(block.get("forall-vars", ()) or ())
    var_names = set(free_vars) | set(forall_vars)
    antecedent_node = block.get("antecedent")
    if antecedent_node is None:
        raise RuleLanguageError("rule.antecedent is required")
    consequent_node = block.get("consequent")
    if consequent_node is None:
        raise RuleLanguageError("rule.consequent is required")
    antecedent = _parse_formula(antecedent_node, var_names)
    consequent = _parse_cell(_consequent_cell_node(consequent_node), var_names)
    return FiberClosureRule(
        free_vars=free_vars,
        forall_vars=forall_vars,
        antecedent=antecedent,
        consequent=consequent,
    )


def parse_rule_record(markdown_text: str) -> LoadedRule | None:
    """Extract the ``rule:`` block from a markdown record in the system.

    Returns ``None`` if the file does not carry a ``rule:`` block —
    so callers can use this on every ``objects/<slug>.md`` and skip
    non-rule records without a separate filter pass.
    """
    fm, body = _split_frontmatter(markdown_text)
    if fm is None:
        return None
    slug = fm.get("slug")
    if not isinstance(slug, str) or not slug:
        return None
    rule_block = _extract_rule_block(body)
    if rule_block is None:
        return None
    rule = parse_rule_block(rule_block)
    return LoadedRule(slug=slug, rule=rule)


# ---- markdown / yaml extraction ------------------------------------------


_FM_RE = re.compile(r"\A---\n(.*?)\n?---\n?(.*)\Z", re.DOTALL)


def _split_frontmatter(text: str) -> tuple[dict | None, str]:
    m = _FM_RE.match(text)
    if not m:
        return None, text
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise RuleLanguageError(f"frontmatter YAML error: {e}") from e
    if not isinstance(fm, dict):
        return None, m.group(2)
    return fm, m.group(2)


# Match a fenced YAML block whose first non-blank line begins with
# ``rule:``. Captures the YAML content (without the fence markers).
_RULE_BLOCK_RE = re.compile(
    r"```(?:ya?ml)?\s*\n(rule:\s*\n.*?)\n```",
    re.DOTALL | re.IGNORECASE,
)


def _extract_rule_block(body: str) -> dict[str, Any] | None:
    """Find the first fenced ``yaml`` block whose top key is ``rule:``
    and return its parsed value. ``None`` if no such block exists."""
    m = _RULE_BLOCK_RE.search(body)
    if not m:
        return None
    try:
        parsed = yaml.safe_load(m.group(1))
    except yaml.YAMLError as e:
        raise RuleLanguageError(f"rule-block YAML error: {e}") from e
    if not isinstance(parsed, dict) or "rule" not in parsed:
        raise RuleLanguageError(
            "fenced rule block must be a YAML mapping with a top-level "
            "rule: key"
        )
    return parsed["rule"]


# ---- formula parsing -----------------------------------------------------


def _parse_formula(node: Any, var_names: set[str]):
    if not isinstance(node, dict):
        raise RuleLanguageError(
            f"formula node must be a mapping, got {type(node).__name__}: {node!r}"
        )
    if len(node) != 1:
        raise RuleLanguageError(
            f"formula node must have exactly one key (and / or / cell / "
            f"fusion), got keys: {sorted(node.keys())!r}"
        )
    (key, value), = node.items()
    if key == "and":
        return And(parts=tuple(_parse_formula(p, var_names) for p in value))
    if key == "or":
        return Or(parts=tuple(_parse_formula(p, var_names) for p in value))
    if key == "cell":
        return _parse_cell(value, var_names)
    if key == "fusion":
        return _parse_fusion(value, var_names)
    raise RuleLanguageError(f"unknown formula node key: {key!r}")


def _parse_cell(node: Any, var_names: set[str]) -> CellAtom:
    if not isinstance(node, dict):
        raise RuleLanguageError(
            f"cell node must be a mapping, got {type(node).__name__}"
        )
    return CellAtom(
        predicate=_required(node, "predicate", "cell"),
        subject=_parse_term(_required(node, "subject", "cell"), var_names),
        object_=_parse_term(_required(node, "object", "cell"), var_names),
        threshold=_parse_threshold(_required(node, "threshold", "cell")),
    )


def _parse_fusion(node: Any, var_names: set[str]) -> FusionAtom:
    if not isinstance(node, dict):
        raise RuleLanguageError(
            f"fusion node must be a mapping, got {type(node).__name__}"
        )
    return FusionAtom(
        predicate_a=_required(node, "predicate-a", "fusion"),
        subject_a=_parse_term(_required(node, "subject-a", "fusion"), var_names),
        object_a=_parse_term(_required(node, "object-a", "fusion"), var_names),
        predicate_b=_required(node, "predicate-b", "fusion"),
        subject_b=_parse_term(_required(node, "subject-b", "fusion"), var_names),
        object_b=_parse_term(_required(node, "object-b", "fusion"), var_names),
        threshold=_parse_threshold(_required(node, "threshold", "fusion")),
    )


def _parse_term(node: Any, var_names: set[str]):
    """Lower a term node to ``Var`` or ``Const``.

    Bare string with name in ``var_names`` → ``Var``.
    Bare string otherwise → ``Const(string)``.
    ``{const: <value>}`` → ``Const(value)`` (force-constant escape).
    ``{var: <name>}`` → ``Var(name)`` (force-variable escape).
    """
    if isinstance(node, dict):
        if "const" in node:
            return Const(node["const"])
        if "var" in node:
            return Var(node["var"])
        raise RuleLanguageError(
            f"term mapping must have key 'const' or 'var', got {sorted(node.keys())!r}"
        )
    if isinstance(node, str):
        if node in var_names:
            return Var(node)
        return Const(node)
    # Numbers, bools, etc. — always constants.
    return Const(node)


def _parse_threshold(node: Any) -> tuple[int, int]:
    if isinstance(node, str):
        if node not in _THRESHOLD:
            raise RuleLanguageError(
                f"threshold must be one of {sorted(_THRESHOLD)!r}, got {node!r}"
            )
        return _THRESHOLD[node]
    raise RuleLanguageError(
        f"threshold must be a string (T / F / BOT / TOP), got {type(node).__name__}"
    )


def _consequent_cell_node(node: Any) -> dict:
    """Allow either ``consequent: { cell: {...} }`` or
    ``consequent: { predicate: ..., subject: ..., ... }`` (cell-shorthand)."""
    if isinstance(node, dict) and "cell" in node and len(node) == 1:
        return node["cell"]
    if isinstance(node, dict):
        return node
    raise RuleLanguageError(
        f"consequent must be a mapping (cell-atom), got {type(node).__name__}"
    )


def _required(node: dict, key: str, ctx: str):
    if key not in node:
        raise RuleLanguageError(f"{ctx} node missing required key {key!r}")
    return node[key]


__all__ = [
    "LoadedRule",
    "RuleLanguageError",
    "parse_rule_block",
    "parse_rule_record",
]



T = BilatticeValue.T
F = BilatticeValue.F


# Rule-record slug constants — the system's rule names. Useful for
# call sites that want to refer to a specific rule slug without
# re-typing the string.
ELIGIBLE_BY_CAPS = "eligible-by-capabilities"
ELIGIBLE_BY_SKILLS = "eligible-by-skills"
ELIGIBLE_BY_CHARTER_BINDING = "eligible-by-charter-binding"
ELIGIBLE_BY_RATE_LIMIT = "eligible-by-rate-limit"
ELIGIBLE_BY_JURISDICTION = "eligible-by-jurisdiction"
SELECTION_BY_LOAD = "selection-by-load"
ASSIGNED_TO = "assigned-to"


# Predicate aliases — frontmatter records use either singular or
# plural depending on whether the value was a scalar or a list. The
# named-shape instantiators expand both forms.
_PRED_ALIASES: dict[str, tuple[str, ...]] = {
    "requires-capabilities": ("requires-capabilities", "requires-capability"),
    "provides-capabilities": ("provides-capabilities", "provides-capability"),
    "requires-skills": ("requires-skills", "requires-skill"),
    "provides-skill": ("provides-skill", "provides-skills"),
    "touches": ("touches",),
    "jurisdiction-write": ("jurisdiction-write", "jurisdiction.write"),
}


def _aliases_for(predicate: str) -> tuple[str, ...]:
    return _PRED_ALIASES.get(predicate, (predicate,))


# Workitem / agent type discriminators. Curated rather than
# system-content-driven because the rule shapes need to know which
# subjects play the W role and which play the A role; declaring this
# in every rule record would be duplicative. ``AGENT_TYPES`` lists
# the substrate kinds whose subjects can be paired with a workitem
# in an Assignment — an agent record covers the LLM-driven case;
# ``automated-process`` agents bind to unix-tools internally.
WORKITEM_TYPES: frozenset[str] = frozenset({"task", "workitem"})
AGENT_TYPES: frozenset[str] = frozenset({"agent"})


# ---- named shapes: subset-cover-positive ---------------------------


def instantiate_subset_cover(
    store: PredicationStore, params: dict[str, Any],
) -> list[StoreRule]:
    """Subset-cover-positive: for each (W, D) pair where D's
    provision-set covers W's requirement-set, emit
    ``(W, consequent_pred, D) = T``.

    Required params: ``requires-predicate``, ``provides-predicate``,
    ``consequent-predicate``.
    """
    requires_preds = _aliases_for(params["requires-predicate"])
    provides_preds = _aliases_for(params["provides-predicate"])
    consequent_pred = params["consequent-predicate"]

    workitems = query.subjects_of_type(store, WORKITEM_TYPES)
    agents = query.subjects_of_type(store, AGENT_TYPES)
    rules: list[StoreRule] = []
    for w in workitems:
        required = query.objects_under(store, w, requires_preds)
        if not required:
            continue
        required_atoms: list[tuple] = []
        for cap in required:
            pred = _first_present_pred(store, w, cap, requires_preds)
            if pred is not None:
                required_atoms.append(((w, pred, cap), T))
        for a in agents:
            provides_atoms: list[tuple] = []
            covered = True
            for cap in required:
                pred = _first_present_pred(store, a, cap, provides_preds)
                if pred is None:
                    covered = False
                    break
                provides_atoms.append(((a, pred, cap), T))
            if not covered:
                continue
            antecedents = tuple(required_atoms + provides_atoms)
            consequents = (((w, consequent_pred, a), T),)
            rules.append(StoreRule(
                antecedents=antecedents, consequents=consequents,
            ))
    return rules


def _first_present_pred(
    store: PredicationStore, subject, obj, predicates: Iterable[str],
) -> str | None:
    for pred in predicates:
        if (subject, pred, obj) in store._values:
            return pred
    return None


# ---- named shapes: disqualification-negative -----------------------


def instantiate_disqualification(
    store: PredicationStore, params: dict[str, Any],
) -> list[StoreRule]:
    """Disqualification-negative: for each agent A whose
    flag-cell ``(A, flag_predicate, flag_object) = T`` holds, for each
    workitem W, emit ``(W, consequent_pred, A) = F``.

    Required params: ``flag-predicate``, ``flag-object``,
    ``consequent-predicate``.
    """
    flag_predicate = params["flag-predicate"]
    flag_object = params["flag-object"]
    consequent_pred = params["consequent-predicate"]

    workitems = query.subjects_of_type(store, WORKITEM_TYPES)
    flagged = {
        a for a in query.subjects_of_type(store, AGENT_TYPES)
        if store.get(a, flag_predicate, flag_object) == T
    }
    rules: list[StoreRule] = []
    for a in flagged:
        for w in workitems:
            antecedents = (((a, flag_predicate, flag_object), T),)
            consequents = (((w, consequent_pred, a), F),)
            rules.append(StoreRule(
                antecedents=antecedents, consequents=consequents,
            ))
    return rules


# ---- named shapes: selection-by-load -------------------------------


def instantiate_selection_by_load(
    store: PredicationStore, params: dict[str, Any],
) -> list[StoreRule]:
    """Selection-by-load: among agents A for which W is
    T-eligible-by-capabilities, the one currently named in the fewest
    ``(_, agent, A) = T`` assignment cells wins (lex tiebreak on slug).

    Required params: ``consequent-predicate``.
    """
    consequent_pred = params["consequent-predicate"]
    eligible_pred = "eligible-by-capabilities"

    workitems = query.subjects_of_type(store, WORKITEM_TYPES)
    agents = query.subjects_of_type(store, AGENT_TYPES)
    if not workitems or not agents:
        return []

    load: dict[object, int] = {}
    for (_assignment, p, a) in query.t_cells(store):
        if p == "agent":
            load[a] = load.get(a, 0) + 1

    rules: list[StoreRule] = []
    for w in workitems:
        required = query.objects_under(store, w, _aliases_for("requires-capabilities"))
        if not required:
            continue
        candidates: list[object] = []
        for a in agents:
            covered = True
            for cap in required:
                if _first_present_pred(
                    store, a, cap, _aliases_for("provides-capabilities"),
                ) is None:
                    covered = False
                    break
            if covered:
                candidates.append(a)
        if not candidates:
            continue
        chosen = min(candidates, key=lambda a: (load.get(a, 0), str(a)))
        antecedents = (((w, eligible_pred, chosen), T),)
        consequents = (((w, consequent_pred, chosen), T),)
        rules.append(StoreRule(
            antecedents=antecedents, consequents=consequents,
        ))
    return rules


# ---- named shapes: subscription-arrival ----------------------------


def instantiate_subscription_arrival(
    store: PredicationStore, params: dict[str, Any],
) -> list[StoreRule]:
    """Subscription-arrival: when a Channel has a pending Message AND
    a Subscriber holds a Subscription on that Channel, the subscriber
    is T-eligible to consume the message.

    Required params: ``consequent-predicate``.
    """
    consequent_pred = params["consequent-predicate"]

    subscriptions: dict[str, tuple[str, str]] = {}
    for (s, p, o) in query.t_cells(store):
        if p == "type" and o == "subscription":
            subscriptions[s] = ("", "")
    for (s, p, o) in query.t_cells(store):
        if s in subscriptions:
            sub_slug, ch_slug = subscriptions[s]
            if p == "subscriber":
                subscriptions[s] = (str(o), ch_slug)
            elif p == "channel":
                subscriptions[s] = (sub_slug, str(o))

    pending: dict[str, set[str]] = {}
    for (s, p, o) in query.t_cells(store):
        if p == "has-pending-message":
            pending.setdefault(s, set()).add(str(o))

    rules: list[StoreRule] = []
    for sub_record, (subscriber, channel) in subscriptions.items():
        if not subscriber or not channel:
            continue
        for message_id in pending.get(channel, ()):
            antecedents = (
                ((sub_record, "type", "subscription"), T),
                ((sub_record, "subscriber", subscriber), T),
                ((sub_record, "channel", channel), T),
                ((channel, "has-pending-message", message_id), T),
            )
            consequents = (
                ((message_id, consequent_pred, subscriber), T),
            )
            rules.append(StoreRule(
                antecedents=antecedents, consequents=consequents,
            ))
    return rules


# ---- named-shape registry ------------------------------------------


ShapeInstantiator = Callable[[PredicationStore, dict[str, Any]], list[StoreRule]]


NAMED_SHAPES: dict[str, ShapeInstantiator] = {
    "subset-cover-positive": instantiate_subset_cover,
    "disqualification-negative": instantiate_disqualification,
    "selection-by-load": instantiate_selection_by_load,
    "subscription-arrival": instantiate_subscription_arrival,
}


# ---- discovery + application ---------------------------------------


def discover_active_rules(
    store: PredicationStore,
) -> list[tuple[str, str | None, dict[str, Any], str]]:
    """Walk the store for ``type: closure-rule-record`` cells; return
    ``(slug, shape, params, body)`` per active record.

    ``shape`` is the named-shape string when present; ``None`` when
    the record uses an inline ``rule:`` block. ``params`` is the
    record's flattened frontmatter cells. ``body`` is the markdown body
    cell — used by the YAML rule grounder to extract the inline
    ``rule:`` block when ``shape`` is ``None``.
    """
    out: list[tuple[str, str | None, dict[str, Any], str]] = []
    for slug in sorted(query.subjects_with(store, "type", "closure-rule-record"), key=str):
        statuses = query.objects_under(store, slug, ("status",))
        if statuses and "active" not in statuses:
            continue
        shape_objs = query.objects_under(store, slug, ("shape",))
        shape = next(iter(shape_objs)) if shape_objs else None
        params = _params_for(store, slug)
        body_objs = query.objects_under(store, slug, ("body",))
        body = next(iter(body_objs), "") if body_objs else ""
        out.append((str(slug), shape, params, str(body)))
    return out


def _params_for(store: PredicationStore, slug) -> dict[str, Any]:
    """Per-slug param dict: predicate → single object (the first
    encountered T-cell). Multi-valued predicates collapse to one
    value here; named-shape instantiators that need the full set
    should query the store directly.
    """
    params: dict[str, Any] = {}
    for (s, p, o) in query.t_cells(store):
        if s == slug and p not in params:
            params[p] = o
    return params


def instantiate_rules(
    store: PredicationStore,
    discovered: Iterable[tuple[str, str | None, dict[str, Any], str]],
) -> list[StoreRule]:
    """Per discovered record, dispatch to its shape instantiator
    (named) or to the YAML grounder (inline ``rule:`` block)."""
    entities = query.all_entities(store)
    rules: list[StoreRule] = []
    for slug, shape, params, raw_text in discovered:
        if shape is not None:
            inst = NAMED_SHAPES.get(shape)
            if inst is None:
                continue
            rules.extend(inst(store, params))
        else:
            loaded = parse_rule_record(raw_text) if raw_text else None
            if loaded is None:
                continue
            rules.extend(ground_rule(loaded.rule, entities))
    return rules


def apply_active_rules(
    *,
    store: PredicationStore,
) -> tuple[PredicationStore, int]:
    """Discover and apply every active rule record in ``store``.

    Returns ``(closed_store, n_cells_changed)``.
    """
    discovered = discover_active_rules(store)
    rules = instantiate_rules(store, discovered)
    if not rules:
        return store, 0
    system = StoreClosureRuleSystem(rules=tuple(rules))
    closed = system.closure(store)
    n_changed = _cell_diff_count(store, closed)
    return closed, n_changed


def _cell_diff_count(
    before: PredicationStore, after: PredicationStore,
) -> int:
    n = 0
    before_values = before._values
    for key, value in after._values.items():
        if before_values.get(key) != value:
            n += 1
    return n


def discover_active_rule_slugs(store: PredicationStore) -> list[str]:
    """Slugs of every active ``closure-rule-record`` in ``store``."""
    return [slug for slug, _shape, _params, _body in
            discover_active_rules(store)]


__all__ = [
    "AGENT_TYPES",
    "NAMED_SHAPES",
    "ShapeInstantiator",
    "WORKITEM_TYPES",
    "apply_active_rules",
    "discover_active_rule_slugs",
    "discover_active_rules",
    "instantiate_disqualification",
    "instantiate_rules",
    "instantiate_selection_by_load",
    "instantiate_subscription_arrival",
    "instantiate_subset_cover",
]
