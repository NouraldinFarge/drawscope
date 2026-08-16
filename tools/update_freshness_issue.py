from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Maintain one GitHub archive-freshness issue."
    )
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--body", type=Path, required=True)
    return parser.parse_args()


def request(
    method: str, url: str, token: str, payload: dict[str, Any] | None = None
) -> Any:
    data = json.dumps(payload).encode() if payload is not None else None
    prepared = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "drawscope-archive-freshness",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(prepared, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:1_000]
        raise RuntimeError(
            f"GitHub API request failed ({error.code}): {detail}"
        ) from error


def main() -> int:
    args = parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    repository = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repository:
        raise RuntimeError("GITHUB_TOKEN and GITHUB_REPOSITORY are required.")
    report = json.loads(args.report.read_text(encoding="utf-8"))
    body = args.body.read_text(encoding="utf-8")
    marker = f"<!-- {report['issue_marker']} -->"
    api_root = f"https://api.github.com/repos/{repository}"
    query = urllib.parse.urlencode(
        {"state": "all", "labels": "data-quality", "per_page": 100}
    )
    issues = request("GET", f"{api_root}/issues?{query}", token)
    tracked = next(
        (
            issue
            for issue in issues
            if "pull_request" not in issue and marker in (issue.get("body") or "")
        ),
        None,
    )
    needs_attention = report["overall_status"] != "current"
    title = "[Data]: Archive snapshot refresh required"
    if needs_attention and tracked is None:
        request(
            "POST",
            f"{api_root}/issues",
            token,
            {"title": title, "body": body, "labels": ["data-quality"]},
        )
        print("Created the archive-freshness maintenance issue.")
    elif needs_attention:
        request(
            "PATCH",
            f"{api_root}/issues/{tracked['number']}",
            token,
            {"title": title, "body": body, "state": "open"},
        )
        print(f"Updated archive-freshness issue #{tracked['number']}.")
    elif tracked is not None and tracked["state"] == "open":
        request(
            "PATCH",
            f"{api_root}/issues/{tracked['number']}",
            token,
            {"body": body, "state": "closed", "state_reason": "completed"},
        )
        print(f"Closed archive-freshness issue #{tracked['number']}.")
    else:
        print("Archive freshness is current; no issue change was needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
