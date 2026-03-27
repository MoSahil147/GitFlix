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
    commit_series = weekly.to_dic("records")
    
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