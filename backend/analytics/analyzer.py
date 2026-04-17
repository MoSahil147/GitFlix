import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any
from schemas import RepoData

# Colours assigned to each contributor in the film — used in S02 (The Cast) and S03 (The Rise)
# Each contributor gets one colour, cycling if there are more than 8
CONTRIBUTOR_COLORS = [
    "#5DCAA5", "#7F77DD", "#EF9F27", "#D85A30",
    "#378ADD", "#D4537E", "#639922", "#888780"
]

def _arc_summary(role: str, login: str, commits: int) -> str:
    # One sentence description of each character — shown in S02 (The Cast)
    summaries = {
        "hero": f"{login} drove the project with {commits} commits, the backbone of this codebase.",
        "ghost": f"{login} contributed {commits} commits then disappeared, their work lives on.",
        "late_joiner": f"{login} joined late but made {commits} meaningful contributions.",
        "consistent": f"{login} showed up consistently across {commits} commits.",
    }
    return summaries.get(role, f"{login} contributed {commits} commits.")


def run_analytics(repo_data: RepoData) -> Dict[str, Any]:

    # ── PART 1: Build the DataFrame ─────────────────────────────────────────
    # Used by: ALL scenes (this is the foundation everything else is built on)
    # Turn the list of commit objects into a table (rows=commits, columns=fields)
    commits_df = pd.DataFrame([c.model_dump() for c in repo_data.commits])

    # Make the timestamp column behave like real dates. utc=True avoids timezone errors
    commits_df["timestamp"] = pd.to_datetime(commits_df["timestamp"], utc=True)

    # Sort oldest commit first so timeseries math works correctly
    commits_df = commits_df.sort_values("timestamp")

    # ── PART 2: Weekly commit timeseries + spike detection ───────────────────
    # Used by: S03 (The Rise) — the animated bar chart that grows over time
    #          S04 (The Plot Twist) — the spike week is the dramatic moment

    # Set timestamp as the DataFrame index so pandas can group by time periods
    commits_df.set_index("timestamp", inplace=True)

    # resample("W") buckets every commit into its calendar week (week-ending Sunday)
    # .count() counts how many commits landed in each bucket
    # reset_index() brings "week" back as a normal column (not the index)
    # sha = Secure Hash algo, its teh 8 random looking chars a3fb12c, we are counting this because sha is never empty never null
    weekly = commits_df["sha"].resample("W").count().reset_index()
    weekly.columns = ["week", "count"]

    # ── SPIKE DETECTION using the 2-SIGMA (2 standard deviation) RULE ──────────
    #
    # MEAN  = the average number of commits per week across the whole repo history.
    #         This is our "baseline" — what a normal week looks like.
    #
    # STD   = the standard deviation — measures how much week-to-week commit counts
    #         SPREAD AROUND the mean. A high std means the repo is bursty;
    #         a low std means it's steady and predictable.
    mean = weekly["count"].mean()
    std  = weekly["count"].std()

    # WHY 2 * STD (2σ)?
    #   In a roughly NORMAL distribution, ~95% of values fall within mean ± 2σ.
    #   So anything ABOVE mean + 2σ is in the top ~2.5% — genuinely unusual.
    #
    #   • 1.5σ threshold → too SENSITIVE, flags many ordinary busy weeks as spikes.
    #   • 3σ threshold   → too STRICT, only catches truly extreme outliers, misses
    #                       real dramatic moments in most repos.
    #   • 2σ is the SWEET SPOT: "unusual but not once-in-a-lifetime."
    #
    # EDGE CASE — LOW-VARIANCE REPOS (e.g. exactly 1 commit every week for years):
    #   std ≈ 0, so mean + 2*std ≈ mean.
    #   Any week with even 2 commits becomes a spike.
    #   This is CORRECT BEHAVIOUR — any burst IS genuinely anomalous for that repo.
    #
    # ASSUMPTION: This heuristic assumes commit counts are ROUGHLY NORMALLY DISTRIBUTED.
    #   In practice they are RIGHT-SKEWED (one big launch week pulls the mean up).
    #   A more robust alternative would use MEDIAN + IQR instead of mean + std,
    #   since median is not affected by outliers.
    weekly["is_spike"] = weekly["count"] > (mean + 2 * std)

    # Convert to list of dicts so the LangChain agent and frontend can consume it
    # → this becomes commit_series in the final return, fed into S03 visual_params
    commit_series = weekly.to_dict("records")

    # ── PART 3: Era detection ────────────────────────────────────────────────
    # Used by: S03 (The Rise) — eras are shown as chapter markers on the timeline
    # A new era starts when the repo goes dead for 4+ weeks then comes back

    # Find all weeks that had zero commits (dead weeks)
    zero_weeks = weekly[weekly["count"] == 0]

    # era_start begins at the very first commit
    era_start = commits_df.index.min()

    eras = []

    # Loop through dead weeks and cut a new era whenever there's a 28+ day gap
    for _, row in zero_weeks.iterrows():
        # If the gap between era_start and this dead week is more than 28 days,
        # a proper active period happened — save it as a completed era
        if (row["week"] - era_start).days > 28:
            eras.append({
                "start": str(era_start.date()),
                "end": str(row["week"].date()),
                "label": "Active period",
            })
            # Move era_start forward to after this dead zone
            era_start = row["week"]

    # Always add the final era (from last dead zone to last commit)
    eras.append({
        "start": str(era_start.date()),
        "end": str(commits_df.index.max().date()),
        "label": "Latest era",
    })

    # ── PART 4: Character arc assignment ────────────────────────────────────
    # Used by: S02 (The Cast) — each contributor becomes a character with a role
    # Roles: hero, ghost, late_joiner, consistent
    # Each character gets a colour, role, commit count, and a one-sentence arc summary

    # Get current time to calculate how long ago someone last committed
    now = pd.Timestamp.now(tz="UTC")

    # Find the midpoint of the repo's life — used to detect late joiners
    repo_midpoint = commits_df.index.min() + (commits_df.index.max() - commits_df.index.min()) / 2

    characters = []
    max_commits = max(c.total_commits for c in repo_data.contributors)
    hero_assigned = False

    for i, contrib in enumerate(repo_data.contributors[:6]):
        # How many days ago did this person last commit?
        age_days = (now - pd.Timestamp(contrib.last_commit)).days

        # Did this person start contributing after the repo's halfway point?
        joined_late = pd.Timestamp(contrib.first_commit) > repo_midpoint

        # Assign a role based on behaviour (charecter time)
        if age_days > 180 and contrib.total_commits > 5:
            # Disappeared 180+ days ago but did real work — they are a ghost
            role = "ghost"

        elif joined_late and contrib.total_commits > 10:
            # Came in late but still made meaningful contributions
            role = "late_joiner"

        elif contrib.total_commits == max_commits and not hero_assigned:
            # Most commits in the whole repo — first one wins, no dual heroes
            role = "hero"
            hero_assigned = True

        else:
            # Everyone else — just showed up consistently
            role = "consistent"

        characters.append({
            "login": contrib.login,
            "color": CONTRIBUTOR_COLORS[i % len(CONTRIBUTOR_COLORS)],
            "role": role,
            "commit_count": contrib.total_commits,
            "active_months": contrib.active_months,
            "arc_summary": _arc_summary(role, contrib.login, contrib.total_commits),
        })

    # ── PART 5: Hero commit detection ───────────────────────────────────────
    # Used by: S06 (The Hero Moment) — shown as the single biggest commit card
    # Hero = the commit that changed the most lines (lines_added + lines_deleted)

    # reset_index() brings timestamp back as a normal column
    # we need this because idxmax() works on column position, not the index
    commits_reset = commits_df.reset_index()

    # Find the row number of the commit with the most lines changed
    hero_idx = (commits_reset["lines_added"] + commits_reset["lines_deleted"]).idxmax()

    # Grab that row
    hero_row = commits_reset.iloc[hero_idx]

    # Store the important details — fed into S06 visual_params in director.py
    hero_commit = {
        "sha": hero_row["sha"],
        "author_login": hero_row["author_login"],
        "message": hero_row["message"],
        "lines_changed": int(hero_row["lines_added"] + hero_row["lines_deleted"]),
        "timestamp": str(hero_row["timestamp"].date()),
    }

    # ── PART 6: Plot twist detection ────────────────────────────────────────
    # Used by: S04 (The Plot Twist) — the most dramatic week becomes the twist scene
    # Plot twist = the spike week with the highest commit count

    # Filter to only the weeks marked as spikes
    spike_rows = weekly[weekly["is_spike"] == True]

    # Default is None — some repos have no spikes at all, S04 still renders with fallback
    plot_twist = None

    if not spike_rows.empty:
        # Find the spike week with the highest commit count
        biggest_spike = spike_rows.loc[spike_rows["count"].idxmax()]

        plot_twist = {
            "week": str(biggest_spike["week"].date()),
            "commit_count": int(biggest_spike["count"]),
            "type": "commit_spike",
        }

    # ── PART 7: Ghost files + final return ──────────────────────────────────
    # Used by: S05 (Ghost Towns) — abandoned files shown as a graveyard visual
    # Ghost = file not touched in 180+ days but was once actively modified
    # NOTE: this always returns [] because file_histories is never populated in ingestion

    # Pull files marked as ghost from ingestion (top 10 only)
    ghost_files = [f.path for f in repo_data.file_histories if f.is_ghost][:10]

    # ── FINAL RETURN ─────────────────────────────────────────────────────────
    # This dict is the analytics object passed to build_script() in director.py
    # Every key maps to at least one scene:
    #   repo_name, description, primary_language → S01, S07
    #   total_commits, repo_age_days, contributor_count → S01, S03, S07
    #   commit_series + eras → S03 visual_params
    #   characters → S02
    #   hero_commit → S06 visual_params
    #   plot_twist → S04
    #   ghost_files → S05
    return {
        "repo_name": repo_data.repo_name,
        "description": repo_data.description,
        "primary_language": repo_data.primary_language,
        "total_commits": repo_data.total_commits,
        "repo_age_days": (datetime.now(timezone.utc) - repo_data.created_at).days,
        "commit_series": [{"week": str(r["week"].date()), "count": int(r["count"])} for r in commit_series],
        "eras": eras,
        "characters": characters,
        "hero_commit": hero_commit,
        "plot_twist": plot_twist,
        "ghost_files": ghost_files,
        "contributor_count": len(repo_data.contributors),
    }