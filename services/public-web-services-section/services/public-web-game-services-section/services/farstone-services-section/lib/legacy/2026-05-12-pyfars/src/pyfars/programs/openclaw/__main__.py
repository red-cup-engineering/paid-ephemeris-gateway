"""CLI entry: python -m pyfars.programs.openclaw <polity-root>"""
import asyncio
import sys
from pathlib import Path

from pyfars.programs.openclaw.workspace import OpenClawWorkspaceMaterializer


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m pyfars.programs.openclaw <polity-root>",
              file=sys.stderr)
        sys.exit(1)
    root = Path(sys.argv[1]).resolve()
    program = OpenClawWorkspaceMaterializer(root)
    result = asyncio.run(program.run())
    for em in result.written:
        print(f"  wrote {em.path}")
    print(f"done — {len(result.written)} agent profiles written")


if __name__ == "__main__":
    main()
