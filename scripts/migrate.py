from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from alembic import command

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.migration import make_alembic_config  # noqa: E402


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run database migrations without alembic.ini.")
    subparsers = parser.add_subparsers(dest="command")

    upgrade_parser = subparsers.add_parser("upgrade", help="Upgrade the database.")
    upgrade_parser.add_argument("revision", nargs="?", default="head")

    downgrade_parser = subparsers.add_parser("downgrade", help="Downgrade the database.")
    downgrade_parser.add_argument("revision")

    subparsers.add_parser("current", help="Show the current database revision.")
    subparsers.add_parser("history", help="Show migration history.")

    stamp_parser = subparsers.add_parser("stamp", help="Stamp the database revision.")
    stamp_parser.add_argument("revision", nargs="?", default="head")

    revision_parser = subparsers.add_parser("revision", help="Create a migration revision.")
    revision_parser.add_argument("-m", "--message", required=True)
    revision_parser.add_argument("--autogenerate", action="store_true")

    args = parser.parse_args(argv)
    selected_command = args.command or "upgrade"
    config = make_alembic_config()

    if selected_command == "upgrade":
        command.upgrade(config, args.revision if args.command else "head")
    elif selected_command == "downgrade":
        command.downgrade(config, args.revision)
    elif selected_command == "current":
        command.current(config)
    elif selected_command == "history":
        command.history(config)
    elif selected_command == "stamp":
        command.stamp(config, args.revision)
    elif selected_command == "revision":
        command.revision(
            config,
            message=args.message,
            autogenerate=args.autogenerate,
        )
    else:
        parser.error(f"Unknown command: {selected_command}")


if __name__ == "__main__":
    main()
