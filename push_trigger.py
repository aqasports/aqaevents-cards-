#!/usr/bin/env python3
"""Commit every local modification and push the current branch.

Useful for quickly sending all workspace changes to GitHub and triggering deploys.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import subprocess
import sys


def run_git(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def git_output(args: list[str]) -> str:
    return run_git(args).stdout.strip()


def has_staged_changes() -> bool:
    return run_git(["diff", "--cached", "--quiet"], check=False).returncode != 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Stage every local modification, commit, and push the current branch."
    )
    parser.add_argument(
        "-m",
        "--message",
        default=None,
        help="Commit message. Defaults to a timestamped sync message.",
    )
    parser.add_argument(
        "--remote",
        default="origin",
        help="Git remote to push to.",
    )
    parser.add_argument(
        "--branch",
        help="Branch to push. Defaults to the current branch.",
    )
    parser.add_argument(
        "--push-only",
        action="store_true",
        help="Skip staging and committing, then only push HEAD.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the git commands without running them.",
    )
    args = parser.parse_args()

    try:
        run_git(["rev-parse", "--is-inside-work-tree"])
        branch = args.branch or git_output(["branch", "--show-current"])
        if not branch:
            print("Could not determine the current branch. Pass --branch explicitly.", file=sys.stderr)
            return 1

        commands: list[list[str]] = []
        if not args.push_only:
            message = args.message or f"chore: sync workspace {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            commands.append(["add", "-A"])
            commands.append(["commit", "-m", message])
        commands.append(["push", args.remote, f"HEAD:{branch}"])

        for command in commands:
            printable = "git " + " ".join(command)
            if args.dry_run:
                print(printable)
                continue

            print(printable)
            if command[0] == "commit" and not has_staged_changes():
                print("No local modifications to commit.")
                continue

            result = run_git(command, check=False)
            if result.stdout:
                print(result.stdout, end="")
            if result.stderr:
                print(result.stderr, end="", file=sys.stderr)
            if result.returncode != 0:
                return result.returncode

        return 0
    except subprocess.CalledProcessError as exc:
        if exc.stderr:
            print(exc.stderr, end="", file=sys.stderr)
        return exc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
