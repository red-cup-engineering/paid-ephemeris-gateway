"""Profile loading — bind the generic toolkit to a specific FARS instance.

A FARS instance is identified by a `.fars/config.toml` at some directory.
This module discovers that file by walking up from a starting path,
parses it, and constructs a ``Profile`` carrying the instance config:
substrate roots, skip patterns, closure-rule list, event-log location,
registered agents.

Discovery semantics mirror ``.git/``: walk parents looking for `.fars/`
with a `config.toml` inside. The first one found wins.

The profile is intentionally a passive data container — it doesn't
*do* anything itself. Callers (heartbeat, validate command, etc.) read
fields from the profile and act on them.
"""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from fars.runtime.agent import Agent, AgentRegistry


@dataclass(frozen=True)
class Profile:
    """A loaded FARS instance config.

    Fields:
      root: the FARS instance root (the directory containing `.fars/`).
      name: human-readable instance name (e.g. "five-six-one").
      description: free-form description.
      substrate_roots: subtrees of ``root`` walked as corpus. Empty
        means walk all of ``root``.
      substrate_skip: glob patterns to skip during substrate walking.
      closure_rules: rule slugs to apply when validating.
      event_log_dir: relative path from ``root`` to the event log dir.
      agents: registered agents from the config.
    """
    root: Path
    name: str = "unnamed"
    description: str = ""
    substrate_roots: tuple[str, ...] = ()
    substrate_skip: tuple[str, ...] = ()
    closure_rules: tuple[str, ...] = ()
    event_log_dir: str = ".fars/event-log"
    agents: AgentRegistry = field(default_factory=AgentRegistry)

    @property
    def fars_dir(self) -> Path:
        return self.root / ".fars"

    @property
    def config_path(self) -> Path:
        return self.fars_dir / "config.toml"

    @property
    def profile_dir(self) -> Path:
        return self.fars_dir / "profile"


def find_profile_root(start: Path) -> Path | None:
    """Walk parents from ``start`` looking for a `.fars/config.toml`.

    Returns the first ancestor directory containing one, or ``None`` if
    no FARS instance is found.
    """
    start = Path(start).resolve()
    if start.is_file():
        start = start.parent
    cur = start
    while True:
        if (cur / ".fars" / "config.toml").is_file():
            return cur
        if cur.parent == cur:
            return None
        cur = cur.parent


def load_profile(root: Path) -> Profile:
    """Load the profile at ``root/.fars/config.toml``.

    ``root`` must already be the instance root — use ``find_profile_root``
    to discover it from a starting path.
    """
    config_path = root / ".fars" / "config.toml"
    with config_path.open("rb") as f:
        cfg = tomllib.load(f)

    instance = cfg.get("instance", {})
    substrate = cfg.get("substrate", {})
    closure = cfg.get("closure", {})
    event_log = cfg.get("event_log", {})
    agents_section = cfg.get("agents", {})

    registry = AgentRegistry()
    for agent_cfg in agents_section.get("registered", []):
        agent = Agent(
            name=agent_cfg["name"],
            capabilities=frozenset(agent_cfg.get("capabilities", [])),
            skills=frozenset(agent_cfg.get("skills", [])),
        )
        registry.register(agent)

    return Profile(
        root=root,
        name=instance.get("name", "unnamed"),
        description=instance.get("description", ""),
        substrate_roots=tuple(substrate.get("roots", [])),
        substrate_skip=tuple(substrate.get("skip", [])),
        closure_rules=tuple(closure.get("rules", [])),
        event_log_dir=event_log.get("dir", ".fars/event-log"),
        agents=registry,
    )


def discover_profile(start: Path | None = None) -> Profile | None:
    """Discover and load the FARS profile at or above ``start``.

    Returns ``None`` if no instance is found. Convenience wrapper
    around ``find_profile_root`` + ``load_profile``.
    """
    start = Path(start) if start is not None else Path.cwd()
    root = find_profile_root(start)
    return load_profile(root) if root is not None else None
