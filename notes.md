. at start like, .gitkeep, .gitignore, .env
means that the filename is hidden

BaseModel → Pydantic's base class. When you inherit from it, your class gets automatic data validation, type checking, and serialization for free
str, int → type hints. They tell Pydantic what data type each field must be. If someone passes a number where a string is expected — Pydantic throws an error immediately

Optional
Some fields might not always have a value. For example — a GitHub repo might not have a description. It could be empty/null.
pythondescription: Optional[str] = None
This means: "this field is a string, but it's okay if it's missing — default to None"
Without Optional, Pydantic would throw an error if that field is missing.

List
When a field contains multiple values. For example — a contributor touches many files, not just one.
pythonlanguages_touched: List[str]
This means: "this field is a list of strings" — like ["Python", "JavaScript", "CSS"]

datetime vs str
This is important. If timestamp is a str you can't do this:
python# How old is this commit?
age = datetime.now() - commit.timestamp  # Only works if timestamp is datetime
You can't do math on strings. datetime lets you calculate differences, sort by date, find earliest/latest commit. That's exactly what our analytics layer needs.

On GitHub, login (username) is mandatory. Every user must have one. But email is optional — many users keep their email private or don't set one at all.

is_ghost:
Think about a real codebase. Some files get created, worked on heavily for a few months, then never touched again. The rest of the project moves on but that file just sits there — abandoned, forgotten.
Like a ghost town.
In GitFlix we define a ghost file as:

A file that hasn't been modified in 180+ days AND was modified more than 3 times in its lifetime — meaning it was once active but got abandoned.

This becomes a whole scene in our video — S05 Ghost Towns. We literally show these abandoned files fading in and out on screen with eerie narration.
That's why is_ghost is a boolean — either a file is a ghost or it isn't.

Pydantic catches bad data at the door. Not deep inside your code.


GitHub → ingestion → analytics → agent → api → frontend

pydantic is like a guard, allows them who have valid id! If they differ, then say them nikal pehli fursat mein!

Optional means that, that thing can have an input or can also not have an input!

Why we need nested Validation!
When a class contains another class as a field, Pydantic validates the outer AND inner class automatically. One call protects everything.

__init__.py tells Python:

"This folder is a Python package. You can import from it."

Without __init__.py, Python treats the folder as just a regular folder — not code. So when we try to do this in main.py:
pythonfrom ingestion.github_client import fetch_repo_data
Python would say — "ingestion? Never heard of it. That's just a folder."
With __init__.py inside — Python recognises ingestion as a package and allows imports from it.
It can be completely empty. Its existence alone is enough. That's why it feels like a dummy file — but its job is very specific.

Step 1 — Parse the URL
Extract facebook/react from https://github.com/facebook/react
Just basic string splitting. No scraping needed.

Step 2 — Connect to GitHub API
Use PyGithub with our token to get the repo object. Then fetch commits, contributors, file data.

Step 3 — Process raw data
Raw GitHub data doesn't match our schemas. We need to transform it into CommitData, ContributorStats, FileHistory objects.

Step 4 — Return RepoData
Package everything into one clean RepoData object and return it.

This is our journey:
URL → parse → fetch → transform → RepoData

Day2 

Q1 — defaultdict proper answer:

With a regular dict:
pythoncontrib_map["sahil"]["commits"] += 1
# KeyError! "sahil" doesn't exist yet

You'd have to write:
if "sahil" not in contrib_map:
    contrib_map["sahil"] = {"commits": 0}
contrib_map["sahil"]["commits"] += 1

With defaultdict:
contrib_map["sahil"]["commits"] += 1
# Works! Auto-creates "sahil" with default value
defaultdict auto-creates missing keys. Cleaner code, no KeyError.

Q2 — timezone proper answer:
It's not about different developer timezones. It's about comparison safety.
GitHub returns timestamps as timezone-aware datetimes. If you try to compare a timezone-aware datetime with a timezone-unaware datetime Python throws an error:(Read again)
(Read againnnnn!!!)

# This crashes
datetime.now() < github_timestamp  # TypeError!

# This works
datetime.now(timezone.utc) < github_timestamp  # ✅
We use timezone.utc to make all our datetimes consistent and comparable.

-> RepoData is a return type hint. It tells Python and any developer reading this code — "this function will always return a RepoData object." Pydantic will enforce this.
max_commits: int = 500 is a default parameter. If nobody specifies how many commits they want, we fetch 500. But the caller can override it — fetch_repo_data(url, max_commits=1000).

fetch_repo_data function

Full breakdown:
"https://github.com/facebook/react"
Step 1 — .rstrip("/")
Removes trailing slash if present. Safety measure.
"https://github.com/facebook/react" # unchanged, no trailing slash
"https://github.com/facebook/react/" → "https://github.com/facebook/react" # fixed
Step 2 — .split("github.com/")
Splits the string at "github.com/" into a list:
["https://", "facebook/react"]
Step 3 — [-1]
Takes the last element of that list:
"facebook/react"
Step 4 — .split("/")
Splits again at "/" :
["facebook", "react"]
So parts[0] = "facebook" and parts[1] = "react"

repo.full_name is a property that PyGithub gives you on the repo object. It returns the repo name in owner/repo format.
repo.full_name → "facebook/react"
PyGithub fetches the repo from GitHub API and gives you a Python object with lots of useful properties:
repo.full_name        # "facebook/react"
repo.description      # "The library for web and native user interfaces"
repo.language         # "JavaScript"
repo.created_at       # datetime object
repo.stargazers_count # 230000
Think of it like this — GitHub's API returns a massive JSON response about the repo. PyGithub wraps that JSON into a clean Python object so instead of:
pythonresponse["full_name"]  # raw JSON way
You just write:
repo.full_name  # PyGithub way - cleaner


GitHub API has a rate limit — unauthenticated users get 60 requests/hour, authenticated get 5000. Each commit fetched = 1 API call. Fetching 10,000 commits = 10,000 API calls = you hit the rate limit and get blocked. 500 is a safe balance between enough data for good analytics and not hammering the API.


object of type 'PaginatedList' has no len()
The problem:
commit.files returns a PaginatedList — a special PyGithub object, not a regular Python list. You can't use len() directly on it.
The fix — convert it to a list first:
Find this line in your code:
pythonfiles_changed=len(commit.files) if commit.files else 0,
Replace it with:
pythonfiles_changed=len(list(commit.files)) if commit.files else 0,
list() converts the PaginatedList into a regular Python list that len() can work on.

GitHub API returns data in pages (default 30 items per page) because sending thousands of records in one response would be massive, slow, and could crash the client. Pagination lets you fetch data in manageable chunks. PyGithub wraps this in a PaginatedList object that fetches next pages automatically as you iterate. Same concept as infinite scroll on Instagram — it doesn't load all 10,000 posts at once. Loads 20, you scroll, loads 20 more.

lambda is an anonymous function — a function with no name. lambda: {...} means "a function that takes no arguments and returns this dictionary every time it's called."

It's used here because defaultdict needs a function to call when creating new keys — not a value directly.

Step 4
List comprehension is a shorter, cleaner way to write a for loop that builds a list. Same result, less code, more readable.
# Regular for loop - 4 lines
contributors = []
for login, data in contrib_map.items():
    if data["commits"] > 0:
        contributors.append(ContributorStats(...))

# List comprehension - 1 line
contributors = [ContributorStats(...) for login, data in contrib_map.items() if data["commits"] > 0]

contributors.sort(key=lambda x: x.total_commits, reverse=True)

key=lambda x: x.total_commits → "sort by comparing each contributor's total_commits value"
reverse=True → "sort in descending order — highest first"
So contributors[0] → the person with the most commits — our hero

step 5
Q1: File history per commit is expensive — each commit requires an extra API call to get file data. 200 commits × API calls is already heavy. 500 would be too slow and risk hitting rate limits. Quality over quantity — 200 gives us enough to identify ghost files.
Q2: set() because one author can modify the same file 50 times. We only want to know who touched it, not how many times. Sets automatically remove duplicates — {"sahil", "parina"} not {"sahil", "sahil", "sahil", "parina"}.

.resample("W") works only when the DataFrame index is a DatetimeIndex. That's it. Pandas needs to know when each row sits in time so it can group rows into weekly buckets. By doing set_index("timestamp"), you're telling pandas "use the datetime column as the axis of time." Without that, pandas has no idea what "weekly" means.
Think of it like a ruler — resample needs a time ruler as the index, not just a regular numbered index (0, 1, 2...).
Concrete check: If you forget set_index and call .resample() on a regular integer index, pandas throws: TypeError: Only valid with DatetimeIndex.

Standard deviation is part of the answer. The full answer is:
This is called Z-score thresholding (specifically a 2-sigma rule). It assumes the data follows a normal distribution (bell curve). The assumption is that most weeks are "average" and spikes are rare outliers.
Does that hold for real repos? No, almost certainly not. Real commit histories are right-skewed — lots of quiet weeks, occasional bursts. A normal distribution assumption understates how extreme spikes actually are. A better fit would be a Poisson or negative binomial distribution. But 2-sigma is good enough for a cinematic tool like GitFlix.

The variable era_start is initialized to commits_df.index.min() — the very first commit. The loop only updates era_start when it finds a zero-week gap greater than 28 days. But it never updates era_start when the gap is ≤28 days.
So if you have zero-weeks at weeks 2, 3, and 4 of the repo, the check (row["week"] - era_start).days > 28 will eventually trigger on week 4 and create an era from the very beginning — eating a near-empty era as if it were an active period. The era boundaries get distorted for repos that had a slow, patchy start.
Also: the final eras.append() after the loop always adds one last era regardless — so a repo with no zero-weeks at all still gets labeled as having two eras.

The list of contributors is already sorted by commits, highest first. So contributors[0] is always the top person.
The bug is: the code checks every contributor against the same max number. If two people tied, both get called "hero." The film then has two heroes which breaks the story.
Easy fix — just give hero to whoever is first in the list. Done.

A dict is just easier to write here. The analytics output gets immediately converted to a JSON string and passed to the agent. Nobody is checking its structure. So there's no point writing a full Pydantic class for it — that's extra work for zero benefit at this stage.

part2 in alayzer 
Take all commits and group them into weekly buckets
Count how many commits happened each week
Calculate what "normal" looks like (average + spread)
Any week way above normal = spike (marked True)
Save this as commit_series — this becomes the animated bar chart in Scene S03

weekly = commits_df["sha"].resample("W").count().reset_index()
Read it left to right:

commits_df["sha"] — pick the sha column (we just need any column to count, sha works fine)
.resample("W") — group the rows into weekly buckets ("W" = week)
.count() — count how many commits fell in each bucket
.reset_index() — after resample, the week dates are stuck as the index. This moves them back into a normal column so we can work with them

### Character arc assignment
- Ghost = last commit 180+ days ago AND more than 5 commits
- Late joiner = first commit after repo midpoint AND more than 10 commits
- Hero = highest commit count in the whole repo
- Consistent = everyone else
- Only top 6 contributors get a character role
- _arc_summary() writes one sentence per character for the film narration

### Hero commit detection
- reset_index() needed because we set timestamp as index earlier
- lines_changed = lines_added + lines_deleted combined
- idxmax() returns the row number of the highest value
- iloc[] grabs a row by its row number

### Plot twist detection
- Filter weekly data to only rows where is_spike is True
- If no spikes exist, plot_twist = None (handled safely)
- spike_rows.loc[idxmax()] finds the row with the highest count
- This becomes the dramatic turning point in Scene S04

### Final return dict
- repo_age_days = calculated fresh here using datetime.now()
- commit_series is cleaned — is_spike column removed, only week + count kept
- ghost_files filtered from file_histories where is_ghost is True
- This dict is the input to the LangChain agent in director.py