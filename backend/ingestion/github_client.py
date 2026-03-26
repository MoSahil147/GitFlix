from langchain_core.load import load
from github import Github

# datetime - for working with dates and times
# timezone - to make all timestamps timezone-aware (UTC)
# timedelta - to calculate time differences e.g. "180 days ago"
from datetime import datetime, timezone,timedelta

# defaultdict - like a regular dict but it auto created missing keys
# saves us from checking everytime ki, "does this key exists" every time
from collections import defaultdict

# you require this for readng GIthub Tokens
import os
from dotenv import load_dotenv
load_dotenv()

# now will import what we already cerated 
from schemas import RepoData, CommitData, ContributorStats, FileHistory

def fetch_repo_data(repo_url: str, max_commits: int=500) -> RepoData:
    # Step 1
    # will connecte the GitHub API using from .env
    token = os.getenv("GITHUB_TOKEN")
    g = Github(token)
    
    ## will parse the URL to get the "owner/repo" format
    # example: input would be "https://github.com/facebook/react", output: will be "facebook", "react"
    # explanation in notes.md
    parts=repo_url.rstrip("/").split("github.com/")[-1].split("/")
    owner=parts[0]
    repo_name=parts[1]
    
    # now we got the owner name and repo, lets dig in brooo
    repo = g.get_repo(f"{owner}/{repo_name}")
    print(f"We are connected to {repo.full_name}")
    
#     # Test (test your repo)
# cd backend
# python3 -c "
# from ingestion.github_client import fetch_repo_data
# fetch_repo_data('https://github.com/facebook/react')
# "

    # Step 2 fetch commits with a limit, we shouldnt be accepting all, I am not a philonthropist
    print(f"Fetching commits (max {max_commits}) ....")
    commits_raw=[]
    
    for commit in repo.get_commits():
        # will stop when we hit the limitt
        if len(commits_raw)>=max_commits:
            break
        try:
            c=commit.commit
            commits_raw.append(CommitData(
                sha=commit.sha[:8], # its commit ID, we dont its all 40, starting 8 is fine to identify any commit
                author_login=commit.author.login if commit.author else "unknown",
                timestamp=c.author.date,
                message=c.message[:200], # save memeory
                files_changed=len(list(commit.files)) if commit.files else 0,
                lines_added=commit.stats.additions if commit.stats else 0,
                lines_deleted=commit.stats.deletions if commit.stats else 0,
            ))
            # Show progress every 10 commits
            if len(commits_raw) % 10 == 0:
                print(f"  -> {len(commits_raw)} commits fetched so far...")
        except Exception as e:
            print(f"Error: {e}")
            continue
    print(f"Fetcheddd {len(commits_raw)} commits")
    
    # Step 3 Now will aggregate contributor statistics
    print("Aggergating conntributor stats")
    # this is creating a dictonary
    # lambda means that it will run the fucntion to generate the default value! 
    # set is like a list but no dups allowed! like perfect for months, that's why we use there
    contrib_map=defaultdict(lambda:{
        "commits":0,
        "lines":0,
        "first":None,
        "last":None,
        "months":set() # see the above comment
    })
    
    for c in commits_raw:
        m = contrib_map[c.author_login] # Gets the stats dict for this author. If "sahil" doesn't exist yet — defaultdict creates it automatically with the defaults above.
        m["commits"] += 1 # seen a commit, increment
        m["lines"] += c.lines_added + c.lines_deleted
        m["months"].add(c.timestamp.strftime("%Y-%m")) # like if the author contributes 10 times in march 2026, only once will get added! That is how we will count the unique months 
        if not m["first"] or c.timestamp < m["first"]: # If we haven't recorded a first commit yet — OR this commit is earlier than the current first — update it.
            m["first"] = c.timestamp
        if not m["last"] or c.timestamp > m["last"]: #the opposite of above logic
            m["last"] = c.timestamp
    print(f"Found {len(contrib_map)} contributors")
    
    