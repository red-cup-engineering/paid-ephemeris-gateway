"""Dispatch table — predication-cell-based message routing.

A DispatchTable maps a predicate (a string slug naming a kind of work)
to a handler — either a callable or a registered agent. When the
heartbeat selects an unsettled flatfile and emits a tick under some
predicate, the dispatch table routes it to the right handler.

This is distinct from the CLI dispatch in ``fars.cli`` (which routes
verb-name → CLI subcommand). Dispatch here is *predication-cell-based*:
the routing key is a predicate slug naming the work type.

The full AOP dispatch table — work-type-to-capability mapping, match
policy as a closure rule, multi-handler bilattice-valued match strength
— lives in the upper-layer ``agential-orchestration-platform`` theory.
This module gives the runtime a minimal working dispatch primitive.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

Handler = Callable[..., Any]


@dataclass
class DispatchTable:
    """Map from predicate slug to handler.

    For each predicate, register one or more handlers. ``dispatch``
    invokes all handlers in registration order and returns their
    results as a list. Single-handler dispatch can ``[0]`` the result.
    """
    _handlers: dict[str, list[Handler]] = field(default_factory=dict)

    def register(self, predicate: str, handler: Handler) -> None:
        """Register a handler for a predicate. Multiple handlers per
        predicate are allowed; they fire in registration order."""
        self._handlers.setdefault(predicate, []).append(handler)

    def unregister(self, predicate: str, handler: Handler) -> None:
        """Remove a specific handler for a predicate. No-op if absent."""
        if predicate in self._handlers:
            try:
                self._handlers[predicate].remove(handler)
            except ValueError:
                pass
            if not self._handlers[predicate]:
                del self._handlers[predicate]

    def handlers_for(self, predicate: str) -> list[Handler]:
        """Return registered handlers for a predicate (empty if none)."""
        return list(self._handlers.get(predicate, ()))

    def predicates(self) -> list[str]:
        """All registered predicate slugs."""
        return list(self._handlers.keys())

    def dispatch(self, predicate: str, *args: Any, **kwargs: Any) -> list[Any]:
        """Invoke all handlers registered for ``predicate``.

        Returns a list of return values, in registration order. If no
        handler is registered, returns an empty list.
        """
        return [h(*args, **kwargs) for h in self.handlers_for(predicate)]
