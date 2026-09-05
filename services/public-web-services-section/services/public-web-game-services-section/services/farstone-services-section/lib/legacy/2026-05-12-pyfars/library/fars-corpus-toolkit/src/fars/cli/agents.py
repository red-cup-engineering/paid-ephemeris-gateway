"""``fars agents [--profile P]`` — list registered agents from the FARS profile.

Discovers the FARS profile (walks parents from CWD looking for
``.fars/config.toml``), prints one line per registered agent with
their capabilities and skills.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.runtime.profile import discover_profile, find_profile_root, load_profile
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="agents",
    description="List registered agents in the discovered FARS profile.",
    example="fars agents",
    output="One line per agent: `<name>  caps=<...>  skills=<...>`.",
    parameters=(
        Parameter(name="profile_root", kind="flag", type=Path, default=None,
                  short="-p",
                  description="explicit FARS instance root (skip discovery)"),
    ),
)


def run(*, profile_root: Path | None = None) -> int:
    if profile_root is not None:
        profile = load_profile(Path(profile_root).resolve())
    else:
        profile = discover_profile(Path.cwd())
    if profile is None:
        print("fars: no FARS profile found (no .fars/config.toml in any parent)", file=sys.stderr)
        return 2
    print(f"profile: {profile.name}  root: {profile.root}")
    if not profile.agents:
        print("(no agents registered)")
        return 0
    for agent in profile.agents:
        caps = ",".join(sorted(agent.capabilities)) or "-"
        skills = ",".join(sorted(agent.skills)) or "-"
        print(f"  {agent.name:24s}  caps={caps}  skills={skills}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(profile_root=args.profile_root)


if __name__ == "__main__":
    sys.exit(main())
