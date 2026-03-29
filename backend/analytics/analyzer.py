import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any
from schemas import RepoData

# collage or colours, this what each contributor get sin the file
CONTRIBUTOR_COLORS = [
    "#5DCAA5", "#7F77DD", "#EF9F27", "#D85A30",
    "#378ADD", "#D4537E", "#639922", "#888780"
]

def _arc_summary(role: str, login: str, commits: int) -> str:
    # One sentence description of each character for the film
    summaries = {
        "hero": f"{login} drove the project with {commits} commits, the backbone of this codebase.",
        "ghost": f"{login} contributed {commits} commits then disappeared, their work lives on.",
        "late_joiner": f"{login} joined late but made {commits} meaningful contributions.",
        "consistent": f"{login} showed up consistently across {commits} commits.",
    }
    return summaries.get(role, f"{login} contributed {commits} commits.")


def run_analytics(repo_data: RepoData) -> Dict[str, Any]:
    # turn the list of comit objects into a table (rows=commits, colums = fields)
    commits_df=pd.DataFrame([c.model_dump() for c in repo_data.commits])
    
    # make the timestamp cloumn that bhenaves like real dates, utc =True avoids timezone errors
    commits_df["timestamp"]=pd.to_datetime(commits_df["timestamp"], utc=True)
    
    # sort oldest commit to first
    commits_df=commits_df.sort_values("timestamp")
    
# Parts 2- weekly commit timeseries + spike detection! 

    # make timestamp the index so we can group by week
    commits_df.set_index("timestamp", inplace=True)
    
    # count commits per week
    weekly = commits_df["sha"].resample("W").count().reset_index()
    weekly.columns=["week", "count"]
    
    # find the average and spread
    mean = weekly["count"].mean()
    std = weekly["count"].std()
    
    # Flag weeks that are unusually busy
    weekly["is_spike"]=weekly["count"]>(mean +2*std)
    
    # convert to list of dicts for the agent
    commit_series = weekly.to_dict("records")
    
# Part 3- ERA dedection, chapters of repo lif. a new era will start when the repo goes dead for 4+ weeekkksss then comes back!
    # find all weeks that had zero commits
    zero_weeks=weekly[weekly["count"]==0]
    
    # era_start beginds at veru forst commit
    era_start=commits_df.index.min()
    
    eras=[]
    
    # loops thorufh the dead week
    for _, row in zero_weeks.iterrows():
        
        # setting the conditions
        # if gap between era_start and the dead week is more than 28 days
        # it means that a proper active period happened - will save that as an era 
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
    
    #  part4 Charcter arc assignment
    # will decide which role who will play in the film
    
    # get current time to calulate how long ago someone last commited
    now = pd.Timestamp.now(tz="UTC")
    
    # will find the middle point of the repo's life
    # use to detect if someone joined late
    repo_midpoint = commits_df.index.min() + (commits_df.index.max()-commits_df.index.min())/2
    
    characters = []
    
    for i, contrib in enumerate(repo_data.contributors[:6]):
        # How many days ago did this person last commit?
        age_days = (now - pd.Timestamp(contrib.last_commit)).days

        # Did this person start contributing after the repo's halfway point?
        joined_late = pd.Timestamp(contrib.first_commit) > repo_midpoint

        # Assign a role based on behaviour
        if age_days > 180 and contrib.total_commits > 5:
            # Disappeared 180+ days ago but did real work — they are a ghost
            role = "ghost"

        elif joined_late and contrib.total_commits > 10:
            # Came in late but still made meaningful contributions
            role = "late_joiner"

        elif contrib.total_commits == max(c.total_commits for c in repo_data.contributors):
            # Most commits in the whole repo — they are the hero
            role = "hero"

        else:
            # Everyone else — just showed up consistently
            role = "consistent"
            
        characters.append({
            "login":contrib.login,
            "color": CONTRIBUTOR_COLORS[i%len(CONTRIBUTOR_COLORS)],
            "role":role,
            "commit_count":contrib.total_commits,
            "active_months":contrib.active_months,
            "arc_summary":_arc_summary(role, contrib.login, contrib.total_commits),
        })
            
    # Part5- Herooo comit detection  
    # reset_index() brings timestamp back as a normal column
    # we need this because idxmax() works on column position not index
    commits_reset = commits_df.reset_index()

    # Find the row number of the commit with most lines changed
    hero_idx = (commits_reset["lines_added"] + commits_reset["lines_deleted"]).idxmax()

    # Grab that row
    hero_row = commits_reset.iloc[hero_idx]

    # Store the important details
    hero_commit = {
        "sha": hero_row["sha"],
        "author_login": hero_row["author_login"],
        "message": hero_row["message"],
        "lines_changed": int(hero_row["lines_added"] + hero_row["lines_deleted"]),
        "timestamp": str(hero_row["timestamp"].date()),
    }
    
    # part 6 - plot twist detection
    # find the single busiest week in the whole repo history

    # filter to only the weeks marked as spikes
    spike_rows = weekly[weekly["is_spike"] == True]

    # default is None — some repos have no spikes at all
    plot_twist = None

    if not spike_rows.empty:

        # find the spike week with the highest commit count
        biggest_spike = spike_rows.loc[spike_rows["count"].idxmax()]

        plot_twist = {
            "week": str(biggest_spike["week"].date()),
            "commit_count": int(biggest_spike["count"]),
            "type": "commit_spike",
        }
        
    # part 7 - ghost files + final return

    # pull files marked as ghost from ingestion
    # ghost = not touched in 180+ days but was modified more than 3 times
    # only take top 10
    ghost_files = [f.path for f in repo_data.file_histories if f.is_ghost][:10]

    # package everything into one dict and return it
    # this is what the LangChain agent will receive
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