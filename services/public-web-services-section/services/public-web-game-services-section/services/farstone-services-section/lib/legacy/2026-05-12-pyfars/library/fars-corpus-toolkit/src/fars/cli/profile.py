"""``fars profile`` — show the discovered FARS instance profile.

Walks parents from CWD looking for ``.fars/config.toml`` and prints
the loaded ``Profile``: instance name, substrate roots, closure rules,
event-log dir, registered agents.

Useful for debugging discovery and for confirming "this CWD is in
which FARS instance."
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.runtime.profile import discover_profile
from fars.spec import VerbSpec, make_argparse

SPEC = VerbSpec(
    name="profile",
    description="Show the discovered FARS instance profile.",
    example="fars profile",
    output="Multi-line summary: name, root, substrate roots, closure rules, agents.",
    parameters=(),
)


def run() -> int:
    profile = discover_profile(Path.cwd())
    if profile is None:
        print("fars: no FARS profile found (no .fars/config.toml in any parent)", file=sys.stderr)
        return 2
    print(f"name:           {profile.name}")
    print(f"description:    {profile.description}")
    print(f"root:           {profile.root}")
    print(f"event-log dir:  {profile.event_log_dir}")
    print()
    print("substrate roots:")
    for r in profile.substrate_roots or ["(all)"]:
        print(f"  - {r}")
    print()
    print(f"closure rules ({len(profile.closure_rules)}):")
    for r in profile.closure_rules:
        print(f"  - {r}")
    print()
    print(f"agents ({len(profile.agents)}):")
    for agent in profile.agents:
        caps = ",".join(sorted(agent.capabilities)) or "-"
        skills = ",".join(sorted(agent.skills)) or "-"
        print(f"  - {agent.name}  caps={caps}  skills={skills}")
    return 0


def main(argv: list[str] | None = None) -> int:
    make_argparse(SPEC).parse_args(argv)
    return run()


if __name__ == "__main__":
    sys.exit(main())
