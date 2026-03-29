from langchain_groq import ChatGroq
from typing import Dict, Any
import json, os
from schemas import ScriptJSON, Scene, Character, Era, PlotTwist, HeroCommit
from agent.tools import (
    analyze_contributors, detect_plot_twist,
    find_hero_commit, identify_ghost_files, get_commit_series
)

# 7 scenes — id, title, duration in seconds, fallback narration
# fallback is used if the LLM fails to generate narration
SCENE_TEMPLATES = {
    "S01": ("The origin",          8,  "The story begins."),
    "S02": ("The cast",            12, "Meet the people who built this."),
    "S03": ("The rise",            20, "Watch the codebase come alive."),
    "S04": ("The plot twist",      10, "Then everything changed."),
    "S05": ("Ghost towns",         8,  "Some ideas were left behind."),
    "S06": ("The hero moment",     12, "One commit changed everything."),
    "S07": ("The state of the world", 15, "This is what was built."),
}

# narrate funnction + the tool calling
def build_script(analytics: Dict[str, Any], tone: str) -> ScriptJSON:

    # set up the Groq LLM — this is what writes the narration
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.7,
        api_key=os.getenv("GROQ_API_KEY")
    )

    # convert analytics dict to a JSON string so tools can read it
    analytics_str = json.dumps(analytics)
    repo_name = analytics["repo_name"]

    # this is the personality of the AI director
    # tone changes how it writes — epic, documentary or casual
    SYSTEM_PROMPT = f"""You are a cinematic film director making a documentary about a software repository.
Tone: {tone}
Repository: {repo_name}

Write compelling narration for each scene. Keep it 2-3 sentences.
Tone guide:
- epic = grand and dramatic
- documentary = factual and thoughtful
- casual = friendly and conversational"""

    # call all 5 tools to pull story data from analytics
    contributors  = json.loads(analyze_contributors.invoke(analytics_str))
    plot_twist_raw = json.loads(detect_plot_twist.invoke(analytics_str))
    hero_raw      = json.loads(find_hero_commit.invoke(analytics_str))
    ghost_files   = json.loads(identify_ghost_files.invoke(analytics_str))
    commit_series = json.loads(get_commit_series.invoke(analytics_str))

    # narrate() sends context to the LLM and gets back 2-3 sentences
    # if LLM fails, it returns the fallback from SCENE_TEMPLATES
    def narrate(scene_id: str, context: str, fallback: str) -> str:
        prompt = f"{SYSTEM_PROMPT}\n\nContext: {context}\n\nWrite 2-3 plain sentences of narration. Output ONLY the sentences — nothing else.\nDo NOT start with Scene, S0, a number, or any label. Do NOT use parentheses, brackets, asterisks, or stage directions. Do NOT mention music, visuals, or the film itself. Do NOT invent or guess any dates — only use dates explicitly given in the context above."
        try:
            return llm.invoke(prompt).content.strip()
        except Exception:
            return fallback
        
# map each scene to the context it needs for narration
    first_week = analytics["commit_series"][0]["week"] if analytics.get("commit_series") else "unknown"

    context_map = {
        "S01": f"First commit by {contributors[0]['login'] if contributors else 'unknown'} on {first_week}",
        "S02": f"Top contributors: {[c['login'] for c in contributors[:3]]}",
        "S03": f"Repo grew to {analytics['total_commits']} commits over {analytics['repo_age_days']} days",
        "S04": f"Plot twist data: {plot_twist_raw}",
        "S05": f"Ghost files: {ghost_files[:5]}",
        "S06": f"Hero commit: {hero_raw.get('message', '')} by {hero_raw.get('author_login', '')}",
        "S07": f"Final stats: {analytics['total_commits']} commits, {analytics['contributor_count']} contributors",
    }

    # build all 7 scenes
    scenes = []
    for scene_id, (title, duration, fallback) in SCENE_TEMPLATES.items():

        # generate narration for this scene using the LLM
        narration = narrate(scene_id, context_map[scene_id], fallback)

        # some scenes need extra data for the visuals
        visual_params = {}
        if scene_id == "S03":
            # rise scene needs the full commit chart data
            visual_params = {"commit_series": commit_series, "eras": analytics.get("eras", [])}
        elif scene_id == "S06":
            # hero scene needs the hero commit details
            visual_params = {"hero": hero_raw}

        scenes.append(Scene(
            scene_id=scene_id,
            title=title,
            duration_secs=duration,
            narration_text=narration,
            visual_params=visual_params,
        ))

    # build character objects from the contributors data
    characters = [Character(**c) for c in contributors[:6]]

    # build plot twist object if one was found
    plot_twist = None
    if plot_twist_raw.get("found"):
        pt_narration = narrate("S04", str(plot_twist_raw), "Then everything changed.")
        plot_twist = PlotTwist(
            week=plot_twist_raw.get("week", ""),
            commit_count=plot_twist_raw.get("commit_count", 0),
            twist_type=plot_twist_raw.get("type", "spike"),
            narration_text=pt_narration,
        )

    # build hero commit object
    hero_narration = narrate("S06", str(hero_raw), "One commit changed everything.")
    hero_commit = HeroCommit(
        sha=hero_raw.get("sha", ""),
        author_login=hero_raw.get("author_login", ""),
        message=hero_raw.get("message", ""),
        lines_changed=hero_raw.get("lines_changed", 0),
        timestamp=hero_raw.get("timestamp", ""),
        narration_text=hero_narration,
    )

    # package everything into ScriptJSON and return
    return ScriptJSON(
        repo_name=analytics["repo_name"],
        description=analytics.get("description"),
        tone=tone,
        primary_language=analytics.get("primary_language"),
        total_commits=analytics["total_commits"],
        repo_age_days=analytics["repo_age_days"],
        contributor_count=analytics["contributor_count"],
        characters=characters,
        eras=[Era(**e) for e in analytics.get("eras", [])],
        plot_twist=plot_twist,
        ghost_files=ghost_files,
        hero_commit=hero_commit,
        commit_series=commit_series,
        scenes=scenes,
    )