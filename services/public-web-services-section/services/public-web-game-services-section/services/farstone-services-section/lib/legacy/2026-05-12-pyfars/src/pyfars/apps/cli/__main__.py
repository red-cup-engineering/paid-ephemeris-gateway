"""``pyfars <verb> [args...]`` — argparse dispatcher.

PyFARS' CLI is lifecycle-only: boot a polity, ask about a running one.
System manipulation goes through the engine's UDS API via the
``pyfars.client`` library, not the CLI — same shape as docker/systemd.
"""
from __future__ import annotations

import argparse
import sys

from pyfars.apps.cli import materialize as materialize_verb
from pyfars.apps.cli import query as query_verb
from pyfars.apps.cli import run as run_verb


def _build_parser() -> tuple[argparse.ArgumentParser, dict[str, argparse.ArgumentParser]]:
    parser = argparse.ArgumentParser(prog="pyfars")
    sub = parser.add_subparsers(dest="verb", required=True)

    verb_parsers: dict[str, argparse.ArgumentParser] = {}

    verb_parsers["run"] = sub.add_parser("run", help="boot a polity-engine")
    run_verb.add_args(verb_parsers["run"])

    verb_parsers["query"] = sub.add_parser("query", help="query a running engine")
    query_verb.add_args(verb_parsers["query"])

    verb_parsers["materialize"] = sub.add_parser(
        "materialize", help="run a harness materializer against the polity",
    )
    materialize_verb.add_args(verb_parsers["materialize"])

    help_parser = sub.add_parser("help", help="show usage for pyfars or a verb")
    help_parser.add_argument(
        "topic", nargs="?",
        help="optional verb to show help for",
    )
    verb_parsers["help"] = help_parser

    return parser, verb_parsers


def _run_help(
    parser: argparse.ArgumentParser,
    verb_parsers: dict[str, argparse.ArgumentParser],
    topic: str | None,
) -> int:
    if topic is None:
        parser.print_help()
        return 0
    topic_parser = verb_parsers.get(topic)
    if topic_parser is None:
        print(f"pyfars help: unknown verb {topic!r}", file=sys.stderr)
        parser.print_help(sys.stderr)
        return 2
    topic_parser.print_help()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser, verb_parsers = _build_parser()
    args = parser.parse_args(argv)
    if args.verb == "run":
        return run_verb.run(args)
    if args.verb == "query":
        return query_verb.run(args)
    if args.verb == "materialize":
        return materialize_verb.run(args)
    if args.verb == "help":
        return _run_help(parser, verb_parsers, args.topic)
    return 1


if __name__ == "__main__":
    sys.exit(main())
