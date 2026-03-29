from langchain.tools import tool
from typing import Dict, Any
import json

# each function below is a "tool" the LangChain agent can call
# the agent passes the full analytics dict as a JSON string
# each tool pulls out one specific piece of information

@tool
def analyze_contributors(analytics: str) -> str:
    """Analyze contributor data and return character profiles with roles and arc summaries."""
    # parse the JSON string back into a dict
    data = json.loads(analytics)
    # pull out just the characters list
    characters = data.get("characters", [])
    # return as JSON string (agent works with strings)
    return json.dumps(characters)

@tool
def detect_plot_twist(analytics: str) -> str:
    """Find the most dramatic moment in the repo history — a commit spike, major refactor, or contributor exodus."""
    data = json.loads(analytics)
    pt = data.get("plot_twist")
    # if no plot twist found, return found: False so agent knows
    if not pt:
        return json.dumps({"found": False})
    return json.dumps({**pt, "found": True})

@tool
def find_hero_commit(analytics: str) -> str:
    """Identify the single most impactful commit in the repository."""
    data = json.loads(analytics)
    return json.dumps(data.get("hero_commit", {}))

@tool
def identify_ghost_files(analytics: str) -> str:
    """Find files that were once active but have been abandoned."""
    data = json.loads(analytics)
    return json.dumps(data.get("ghost_files", []))

@tool
def get_commit_series(analytics: str) -> str:
    """Get the weekly commit timeseries for the animated rise scene."""
    data = json.loads(analytics)
    return json.dumps(data.get("commit_series", []))

