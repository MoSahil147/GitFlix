from github import Github

# datetime - for working with dates and times
# timezone - to make all timestamps timezone-aware (UTC)
# timedelta - to calculate time differences e.g. "180 days ago"
import re
from datetime import datetime, timezone, timedelta

# defaultdict - like a regular dict but it auto created missing keys
# saves us from checking everytime ki, "does this key exists" every time
from collections import defaultdict

# you require this for readng GIthub Tokens
import os
from dotenv import load_dotenv
load_dotenv()

# now will import what we already cerated 
from schemas import RepoData, CommitData, ContributorStats, FileHistory

_GITHUB_URL_RE = re.compile(r'^https://github\.com/[\w.-]+/[\w.-]+/?$')

def _validate_repo_url(url: str) -> str:
    """Normalize and validate. Returns the cleaned URL or raises ValueError."""
    url = url.strip().lower()
    if not _GITHUB_URL_RE.match(url):
        raise ValueError(f"Invalid GitHub repo URL: '{url}'. Must be https://github.com/owner/repo")
    return url.rstrip("/")

def fetch_repo_data(repo_url: str, max_commits: int=500) -> RepoData:
    # Step 1
    repo_url = _validate_repo_url(repo_url)

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
    
    # Step 4 Convert the raw data into proper Pydantic Contributor Stats objects
    print("Building the Contributor profiles....")
    
    # List is cleaner than for loop and same results
    contributors = [
        ContributorStats(
            login=login, # will get the username 
            email=None, # cants get from commit data
            total_commits=data["commits"],
            first_commit=data["first"],
            last_commit=data["last"],
            languages_touched=[], # filled later in analytics
            total_lines_changed=data["lines"],
            active_months=len(data["months"])
        )
        for login, data in contrib_map.items() # iterate over all authors
        if data["commits"] > 0
    ]
    
    # sort descending by the commits, our hero contributor is always at index[0]
    contributors.sort(key=lambda x: x.total_commits, reverse=True)
    print(f"Top contributor: {contributors[0].login} with {contributors[0].total_commits} commits")
    
    # step 5 now wll build file histories to find ghost files
    print("Fetching file histories.....")
    file_map=defaultdict(lambda: {
        "modified":0,
        "authors":set(),
        "dates":[]
    })
    
    # only look at the last 200 commits for file data: Quality over Quantity
    for commit in repo.get_commits()[:200]:
        try:
            for f in commit.files:
                file_map[f.filename]["modified"] += 1
                if commit.author:
                    file_map[f.filename]["authors"].add(commit.author.login)
                file_map[f.filename]["dates"].append(commit.commit.author.date)
        except Exception:
            continue
    print(f"Found {len(file_map)} unique files")
    
    # step6
    # Now will package everything into RepoData and return it
    # buildin filehistory objects and detect ghost files
    cutoff = datetime.now(timezone.utc) - timedelta(days=180)
    file_histories=[]
    
    for path, data in list(file_map.items())[:200]:
        dates = sorted(data["dates"])
        last_mod=dates[-1] if dates else datetime.now(timezone.utc)
        file_histories.append(FileHistory(
            path=path, # file path
            created=dates[0] if dates else datetime.now(timezone.utc), # first time the file appeared
            last_modified=last_mod,
            total_modifications=data["modified"],
            authors=list(data["authors"]),
            # ghost files which arent touched in 180+ days
            is_ghost=(last_mod < cutoff and data["modified"] > 3)
        ))
        
    # step 7 Package time, package everything into one repoData object and return
    print("Package everything into RepoData...")
    return RepoData(
        repo_name=repo.full_name, # repo names
        repo_url=repo_url, # url
        description=repo.description, # des
        created_at=repo.created_at, # date of creation, Happy Birthday
        primary_language=repo.language, # main lnagauge Spanish, german, .... Kidding Python, Java... mahiya se Java Java
        total_commits=len(commits_raw), # commits fetched
        commits=commits_raw, # list of CommitData Objects
        contributors=contributors[:20], # top 20 contributors only
        file_histories=file_histories, # list of FileHistory objects
    )
                
    