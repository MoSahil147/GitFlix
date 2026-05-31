import logging
import os
import re
import threading
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Callable, Optional

from dotenv import load_dotenv
from github import Github

from schemas import RepoData, CommitData, ContributorStats, FileHistory

load_dotenv()

log = logging.getLogger("gitflix.ingestion")

# bouncher alert
_GITHUB_URL_RE = re.compile(r"^https://github\.com/[\w.-]+/[\w.-]+/?$")


def _validate_repo_url(url: str) -> str:
    url = url.strip().lower()
    if not url.startswith("https://"):
        if url.startswith("http://"):
            url = "https://" + url[len("http://"):]
        else:
            url = "https://" + url
    if not _GITHUB_URL_RE.match(url):
        raise ValueError(
            f"Invalid GitHub repo URL: '{url}'. Must be https://github.com/owner/repo"
        )
    return url.rstrip("/")


# we will fetch all the datas here
def fetch_repo_data(
    repo_url: str,
    max_commits: int = 100,
    on_progress: Optional[Callable[[int, str], None]] = None,
    cancel_event: Optional[threading.Event] = None,
) -> RepoData:
    """
    Fetches repository data from GitHub.
    Optimized to reduce API calls and prevent timeouts.
    Supports cancellation via cancel_event - when set, returns partial data immediately.
    """
    repo_url = _validate_repo_url(repo_url)
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        log.warning("GITHUB_TOKEN not found. API rate limits will be very restrictive.")
    # we are getting connecting here
    g = Github(token)

    # url parsing, https://github.com/mosahil147/GitFlix,  -1 -> last part with us!
    parts = repo_url.rstrip("/").split("github.com/")[-1].split("/")
    owner, repo_name = parts[0], parts[1]
    # we are getting the repo from here
    if cancel_event and cancel_event.is_set():
        raise RuntimeError("Cancelled before connecting")
    if on_progress:
        on_progress(5, f"Connecting to {owner}/{repo_name}...")
    repo = g.get_repo(f"{owner}/{repo_name}")

    # Step 1: Fetch commit list (lightweight)
    if cancel_event and cancel_event.is_set():
        raise RuntimeError("Cancelled before fetching commits")
    if on_progress:
        on_progress(10, "Fetching commit history...")
    commits_raw = []

    # We fetch more commits but only get details for the first 'max_commits'
    # This allows us to get broad contributor stats without hitting too many API endpoints
    all_commits = repo.get_commits()

    # (Clever) Limit to 300 for general stats, but only 100 for detailed file/line info
    total_to_scan = min(300, all_commits.totalCount)

    detailed_limit = max_commits  # 100 in the case, have defined above

    # better tracking, the Scoreboard
    # default dict is crazyy, as normal dict would crash on missing key, but this guy will create a blank entry!
    contrib_map = defaultdict(
        lambda: {"commits": 0, "lines": 0, "first": None, "last": None, "months": set()}
    )

    # per-file tracking — built from files we already fetch in the detailed loop, zero extra API calls
    def _file_entry():
        return {"first": None, "last": None, "count": 0, "authors": set()}

    file_map: dict[str, dict] = defaultdict(_file_entry)

    if on_progress:
        on_progress(15, f"Analyzing {total_to_scan} commits...")

    idx = 0
    for commit in all_commits:
        if idx >= total_to_scan:
            break

        # Check cancellation every 10 commits to avoid unnecessary API calls
        if cancel_event and cancel_event.is_set():
            log.info("Ingestion cancelled after %d commits", idx)
            break

        author_login = commit.author.login if commit.author else "unknown"
        timestamp = commit.commit.author.date

        # Detailed info for the first 'detailed_limit' commits
        if idx < detailed_limit:
            try:
                # This triggers API calls for files and stats
                file_list = list(commit.files) if commit.files else []
                files_changed = len(file_list)
                lines_added = commit.stats.additions if commit.stats else 0
                lines_deleted = commit.stats.deletions if commit.stats else 0

                # Grab up to 8 patch lines from the first file that has a patch
                diff_excerpt = None
                for f in file_list:
                    if getattr(f, "patch", None):
                        lines = f.patch.splitlines()[:8]
                        diff_excerpt = "\n".join(lines)
                        break

                # Track per-file last/first touched using timestamps we already have
                for f in file_list:
                    fm = file_map[f.filename]
                    fm["count"] += 1
                    fm["authors"].add(author_login)
                    if not fm["first"] or timestamp < fm["first"]:
                        fm["first"] = timestamp
                    if not fm["last"] or timestamp > fm["last"]:
                        fm["last"] = timestamp

                commits_raw.append(
                    CommitData(
                        sha=commit.sha[:8],
                        author_login=author_login,
                        timestamp=timestamp,
                        message=commit.commit.message[:200],
                        files_changed=files_changed,
                        lines_added=lines_added,
                        lines_deleted=lines_deleted,
                        diff_excerpt=diff_excerpt,
                    )
                )

                # Update line stats for contributors, for better tracking
                contrib_map[author_login]["lines"] += lines_added + lines_deleted

            except Exception as e:
                log.error(f"Error fetching detailed commit {commit.sha[:8]}: {e}")
                # Fallback to basic data
                commits_raw.append(
                    CommitData(
                        sha=commit.sha[:8],
                        author_login=author_login,
                        timestamp=timestamp,
                        message=commit.commit.message[:200],
                        files_changed=0,
                        lines_added=0,
                        lines_deleted=0,
                    )
                )

        # General stats for all scanned commits
        # first to detct late joiners, last to detect ghosts!
        m = contrib_map[author_login]
        m["commits"] += 1
        m["months"].add(timestamp.strftime("%Y-%m"))
        if not m["first"] or timestamp < m["first"]:
            m["first"] = timestamp
        if not m["last"] or timestamp > m["last"]:
            m["last"] = timestamp

        idx += 1
        if on_progress and idx % 20 == 0:
            pct = 15 + int((idx / total_to_scan) * 10)
            on_progress(pct, f"Fetched {idx}/{total_to_scan} commits...")

    # If cancelled with no data, raise so the streaming endpoint catches it
    if cancel_event and cancel_event.is_set() and not commits_raw:
        raise RuntimeError("Cancelled during ingestion")

    # Step 2: Contributors
    if cancel_event and cancel_event.is_set():
        log.info("Ingestion cancelled before building contributor profiles")
        raise RuntimeError("Cancelled during ingestion")
    if on_progress:
        on_progress(25, "Building contributor profiles...")
    contributors = [
        ContributorStats(
            login=login,
            total_commits=data["commits"],
            first_commit=data["first"],
            last_commit=data["last"],
            languages_touched=[],
            total_lines_changed=data["lines"],
            active_months=len(data["months"]),
        )
        for login, data in contrib_map.items()
        if data["commits"] > 0
    ]
    contributors.sort(key=lambda x: x.total_commits, reverse=True)

    # Step 3: File Histories — derived from file_map built during the detailed commit loop
    if cancel_event and cancel_event.is_set():
        log.info("Ingestion cancelled before analyzing file activity")
        raise RuntimeError("Cancelled during ingestion")
    if on_progress:
        on_progress(28, "Analyzing file activity...")
    ghost_cutoff = datetime.now(timezone.utc) - timedelta(days=180)
    file_histories = []
    for path, fm in file_map.items():
        if not fm["first"] or not fm["last"]:
            continue
        last_modified = (
            fm["last"] if fm["last"].tzinfo else fm["last"].replace(tzinfo=timezone.utc)
        )
        first_seen = (
            fm["first"]
            if fm["first"].tzinfo
            else fm["first"].replace(tzinfo=timezone.utc)
        )
        is_ghost = last_modified < ghost_cutoff
        file_histories.append(
            FileHistory(
                path=path,
                created=first_seen,
                last_modified=last_modified,
                total_modifications=fm["count"],
                authors=list(fm["authors"]),
                is_ghost=is_ghost,
            )
        )

    if on_progress:
        on_progress(30, "Finalizing repository data...")

    return RepoData(
        repo_name=repo.full_name,
        repo_url=repo_url,
        description=repo.description,
        created_at=repo.created_at,
        primary_language=repo.language,
        total_commits=all_commits.totalCount,
        commits=commits_raw,
        contributors=contributors[:20],
        file_histories=file_histories,
    )
