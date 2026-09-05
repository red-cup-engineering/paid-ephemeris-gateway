"""Agent abstraction and registry.

A FARS agent is an entity — human or program — that acts on the
substrate by invoking operators. Each agent carries a name, a set of
capabilities (what kinds of work it can perform), and a set of skills /
runbooks (named procedures it knows how to execute).

The agent abstraction is intentionally light here. The full AOP-side
content — capability fiber bundles, skill-as-predication-fiber, runbook
composition — lives in the upper-layer ``predicated-computing`` and
``agential-orchestration-platform`` theories. This module gives the
runtime a structural placeholder so witnesses can carry an ``agent``
attribution and the dispatch table can route to registered agents.

Initial expected registrations:
- ``claude-code`` — the agent running this Python session.
- ``ci`` — automated CI runners.
- Future scheduled agents.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Agent:
    """A registered FARS agent.

    Fields:
      name: stable identifier (used in witness ``agent`` field).
      capabilities: set of capability slugs the agent advertises.
      skills: set of skill slugs the agent has registered runbooks for.
      metadata: open dict for agent-specific data (e.g. version, host).
    """
    name: str
    capabilities: frozenset[str] = field(default_factory=frozenset)
    skills: frozenset[str] = field(default_factory=frozenset)
    metadata: tuple[tuple[str, str], ...] = ()

    def has_capability(self, cap: str) -> bool:
        return cap in self.capabilities

    def has_skill(self, skill: str) -> bool:
        return skill in self.skills


@dataclass
class AgentRegistry:
    """Mutable registry of agents, keyed by name."""
    agents: dict[str, Agent] = field(default_factory=dict)

    def register(self, agent: Agent) -> None:
        if agent.name in self.agents:
            raise ValueError(f"agent {agent.name!r} already registered")
        self.agents[agent.name] = agent

    def get(self, name: str) -> Agent | None:
        return self.agents.get(name)

    def by_capability(self, cap: str) -> list[Agent]:
        return [a for a in self.agents.values() if a.has_capability(cap)]

    def by_skill(self, skill: str) -> list[Agent]:
        return [a for a in self.agents.values() if a.has_skill(skill)]

    def __len__(self) -> int:
        return len(self.agents)

    def __iter__(self):
        return iter(self.agents.values())
