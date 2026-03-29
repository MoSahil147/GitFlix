from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

# CommitData represents a single commit in the repository
class CommitData(BaseModel):
    sha: str                    # unique 8-char identifier for the commit
    author_login: str           # GitHub username of the author
    timestamp: datetime         # when the commit was made (datetime for math operations)
    message: str                # commit message
    files_changed: int          # how many files were touched
    lines_added: int            # lines of code added
    lines_deleted: int          # lines of code deleted

# ContributorStats represents one contributor's overall stats
class ContributorStats(BaseModel):
    login: str                          # GitHub username... mandatory, every user has one
    email: Optional[str] = None         # optional, many users keep email private, like one should their life
    total_commits: int                  # total number of commits made
    first_commit: datetime              # when they first contributed
    last_commit: datetime               # when they last contributed
    languages_touched: List[str]        # list because one contributor can touch many languages
    total_lines_changed: int            # total lines added + deleted
    active_months: int                  # how many months they were active

# FileHistory represents the lifecycle of a single file
class FileHistory(BaseModel):
    path: str                           # file path e.g. backend/main.py
    created: datetime                   # when file was first committed
    last_modified: datetime             # when file was last touched
    total_modifications: int            # how many times it was changed
    authors: List[str]                  # list because multiple people can edit one file
    is_ghost: bool                      # True if not touched in 180+ days and was once active

# RepoData is the master object - contains everything about the repository
class RepoData(BaseModel):
    repo_name: str                          # e.g. "facebook/react"
    repo_url: str                           # full GitHub URL
    description: Optional[str] = None      # optional, some repos have no description, how they can describe their life
    created_at: datetime                    # when repo was created
    primary_language: Optional[str] = None # optional, some repos have no primary language
    total_commits: int                      # total commit count
    commits: List[CommitData]              # list of CommitData objects - nested validation
    contributors: List[ContributorStats]   # list of ContributorStats objects - nested validation
    file_histories: List[FileHistory]      # list of FileHistory objects - nested validation


# Character = one contributor's role in the film
class Character(BaseModel):
    login: str
    color: str                                                    # hex color assigned to them
    role: Literal["hero", "ghost", "late_joiner", "consistent"]  # only these 4 values allowed
    commit_count: int
    active_months: int
    arc_summary: str                                              # one sentence about them

# Era = one active period in the repo's life
class Era(BaseModel):
    start: str        # date as string e.g. "2023-01-01"
    end: str
    label: str        # e.g. "Active period" or "Latest era"

# PlotTwist = the most dramatic week in the repo
class PlotTwist(BaseModel):
    week: str
    commit_count: int
    twist_type: str         # e.g. "commit_spike"
    narration_text: str     # written by the LLM later

# HeroCommit = the single biggest commit in the repo
class HeroCommit(BaseModel):
    sha: str
    author_login: str
    message: str
    lines_changed: int
    timestamp: str
    narration_text: str          # written by the LLM later
    diff_excerpt: Optional[str] = None  # optional code snippet

# Scene = one scene in the documentary film
class Scene(BaseModel):
    scene_id: str        # S01 through S07
    title: str
    duration_secs: int
    narration_text: str
    visual_params: Dict[str, Any] = {}   # extra data each scene needs
    audio_url: Optional[str] = None      # base64 data URI for ElevenLabs TTS voiceover

# ScriptJSON = the master object the agent returns
# contains everything needed to render the full film
class ScriptJSON(BaseModel):
    repo_name: str
    description: Optional[str]
    tone: Literal["epic", "documentary", "casual"]
    primary_language: Optional[str]
    total_commits: int
    repo_age_days: int
    contributor_count: int
    characters: List[Character]
    eras: List[Era]
    plot_twist: Optional[PlotTwist]
    ghost_files: List[str]
    hero_commit: HeroCommit
    commit_series: List[Dict[str, Any]]
    scenes: List[Scene]