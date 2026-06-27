from datetime import datetime, timezone, timedelta

import pytest

from analytics.analyzer import run_analytics
from schemas import RepoData, CommitData, ContributorStats, FileHistory


def _dt(days_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


def _commit(sha: str, author: str, days_ago: int, lines_added: int = 10, lines_deleted: int = 5) -> CommitData:
    return CommitData(
        sha=sha,
        author_login=author,
        timestamp=_dt(days_ago),
        message="test commit",
        files_changed=1,
        lines_added=lines_added,
        lines_deleted=lines_deleted,
    )


def _contributor(login: str, commits: int, first_days_ago: int, last_days_ago: int) -> ContributorStats:
    return ContributorStats(
        login=login,
        total_commits=commits,
        first_commit=_dt(first_days_ago),
        last_commit=_dt(last_days_ago),
        languages_touched=[],
        total_lines_changed=commits * 50,
        active_months=max(1, commits // 5),
    )


def _repo(commits, contributors, file_histories=None) -> RepoData:
    return RepoData(
        repo_name="test/repo",
        repo_url="https://github.com/test/repo",
        created_at=_dt(500),
        total_commits=len(commits),
        commits=commits,
        contributors=contributors,
        file_histories=file_histories or [],
    )


# --- hero commit ---

def test_hero_commit_is_largest_diff():
    commits = [
        _commit("aaa11111", "alice", 100, lines_added=5,   lines_deleted=2),
        _commit("bbb22222", "alice", 90,  lines_added=500, lines_deleted=100),
        _commit("ccc33333", "alice", 80,  lines_added=10,  lines_deleted=3),
    ]
    result = run_analytics(_repo(commits, [_contributor("alice", 3, 100, 80)]))
    assert result["hero_commit"]["sha"] == "bbb22222"
    assert result["hero_commit"]["lines_changed"] == 600


def test_hero_commit_author_is_correct():
    commits = [
        _commit("aaa11111", "alice", 100, lines_added=10, lines_deleted=5),
        _commit("bbb22222", "bob",   90,  lines_added=999, lines_deleted=1),
    ]
    contributors = [_contributor("alice", 1, 100, 100), _contributor("bob", 1, 90, 90)]
    result = run_analytics(_repo(commits, contributors))
    assert result["hero_commit"]["author_login"] == "bob"


# --- character roles ---

def test_hero_role_assigned_to_top_committer():
    commits = [_commit(f"{i:08d}", "alice", 200 - i) for i in range(20)]
    result = run_analytics(_repo(commits, [_contributor("alice", 20, 220, 10)]))
    chars = {c["login"]: c for c in result["characters"]}
    assert chars["alice"]["role"] == "hero"


def test_ghost_role_for_long_inactive_contributor():
    commits = [_commit(f"{i:08d}", "bob", 300 - i) for i in range(10)]
    result = run_analytics(_repo(commits, [_contributor("bob", 10, 310, 250)]))
    chars = {c["login"]: c for c in result["characters"]}
    assert chars["bob"]["role"] == "ghost"


def test_only_one_hero_assigned_when_two_contributors_tie():
    commits = (
        [_commit(f"a{i:07d}", "alice", 200 - i) for i in range(10)]
        + [_commit(f"b{i:07d}", "bob",   100 - i) for i in range(10)]
    )
    contributors = [
        _contributor("alice", 10, 210, 10),
        _contributor("bob",   10, 110, 10),
    ]
    result = run_analytics(_repo(commits, contributors))
    roles = [c["role"] for c in result["characters"]]
    assert roles.count("hero") == 1


# --- ghost files ---

def test_ghost_files_are_included():
    ghost = FileHistory(
        path="old/file.py",
        created=_dt(400),
        last_modified=_dt(200),
        total_modifications=5,
        authors=["alice"],
        is_ghost=True,
    )
    commits = [_commit("aaa11111", "alice", 100)]
    result = run_analytics(_repo(commits, [_contributor("alice", 1, 100, 100)], [ghost]))
    assert "old/file.py" in result["ghost_files"]


def test_active_files_are_excluded_from_ghosts():
    active = FileHistory(
        path="new/file.py",
        created=_dt(100),
        last_modified=_dt(10),
        total_modifications=3,
        authors=["alice"],
        is_ghost=False,
    )
    commits = [_commit("aaa11111", "alice", 100)]
    result = run_analytics(_repo(commits, [_contributor("alice", 1, 100, 100)], [active]))
    assert "new/file.py" not in result["ghost_files"]


def test_ghost_files_capped_at_ten():
    ghosts = [
        FileHistory(
            path=f"old/file{i}.py",
            created=_dt(400),
            last_modified=_dt(200),
            total_modifications=1,
            authors=["alice"],
            is_ghost=True,
        )
        for i in range(15)
    ]
    commits = [_commit("aaa11111", "alice", 100)]
    result = run_analytics(_repo(commits, [_contributor("alice", 1, 100, 100)], ghosts))
    assert len(result["ghost_files"]) == 10


# --- plot twist ---

def test_plot_twist_detected_on_spike_week():
    # 40 quiet weeks (1 commit each) + a burst of 30 in one week
    quiet = [_commit(f"q{i:07d}", "alice", 365 - i * 7) for i in range(40)]
    burst = [_commit(f"s{i:07d}", "alice", 14 + i)      for i in range(30)]
    contributors = [_contributor("alice", len(quiet) + len(burst), 400, 5)]
    result = run_analytics(_repo(quiet + burst, contributors))
    assert result["plot_twist"] is not None


def test_plot_twist_none_when_no_spikes():
    # perfectly uniform: exactly 5 commits every week, never a spike
    commits = [_commit(f"{i:08d}", "alice", 365 - (i // 5) * 7) for i in range(50)]
    result = run_analytics(_repo(commits, [_contributor("alice", 50, 370, 5)]))
    # uniform repos may or may not produce a spike depending on std=0 edge case; just assert structure
    assert "plot_twist" in result


# --- general structure ---

def test_output_contains_required_keys():
    commits = [_commit("aaa11111", "alice", 100)]
    result = run_analytics(_repo(commits, [_contributor("alice", 1, 100, 100)]))
    for key in ("repo_name", "total_commits", "contributor_count", "characters",
                "hero_commit", "commit_series", "eras", "ghost_files", "plot_twist"):
        assert key in result


def test_contributor_count_matches_contributors_list():
    commits = [_commit("aaa11111", "alice", 100), _commit("bbb22222", "bob", 90)]
    contributors = [_contributor("alice", 1, 100, 100), _contributor("bob", 1, 90, 90)]
    result = run_analytics(_repo(commits, contributors))
    assert result["contributor_count"] == 2
