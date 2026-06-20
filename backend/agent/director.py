import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from agent.llm_balancer import LLMLoadBalancer
from schemas import ScriptJSON, Scene, Character, Era, PlotTwist, HeroCommit


class CancelledError(Exception):
    """Raised when the generation is cancelled by the client."""
    pass


def _check_cancelled(cancel_event: threading.Event | None) -> None:
    if cancel_event is not None and cancel_event.is_set():
        raise CancelledError("Generation cancelled by client")


SCENE_TEMPLATES = {
    "S01": ("The origin",           8,  "The story begins."),
    "S02": ("The cast",             12, "Meet the people who built this."),
    "S03": ("The rise",             20, "Watch the codebase come alive."),
    "S04": ("The plot twist",       10, "Then everything changed."),
    "S05": ("Ghost towns",          8,  "Some ideas were left behind."),
    "S06": ("The hero moment",      12, "One commit changed everything."),
    "S07": ("The state of the world", 15, "This is what was built."),
}


def build_script(
    analytics: dict[str, Any],
    tone: str,
    cancel_event: threading.Event | None = None,
) -> ScriptJSON:

    llm = LLMLoadBalancer(temperature=0.7)
    repo_name = analytics["repo_name"]

    SYSTEM_PROMPT = f"""You are a narrator for a cinematic documentary about a software project.
Tone: {tone}
Project: {repo_name}

Write narration exactly as it will be spoken aloud by a human voice actor.
Tone guide:
- epic = grand, powerful, like a movie trailer narrator
- documentary = calm, thoughtful, like a BBC documentary
- casual = warm, conversational, like a friend telling a story

Speak naturally. Use contractions. Vary sentence rhythm. Sound like a real person talking."""

    # Pull story data directly from analytics dict — no JSON round-trip
    _check_cancelled(cancel_event)
    contributors = analytics.get("characters", [])

    _check_cancelled(cancel_event)
    pt = analytics.get("plot_twist")
    plot_twist_raw = {**pt, "found": True} if pt else {"found": False}

    _check_cancelled(cancel_event)
    hero_raw = analytics.get("hero_commit", {})

    _check_cancelled(cancel_event)
    ghost_files = analytics.get("ghost_files", [])

    _check_cancelled(cancel_event)
    commit_series = analytics.get("commit_series", [])

    def narrate(scene_id: str, context: str, fallback: str) -> str:
        _check_cancelled(cancel_event)
        prompt = (
            f"{SYSTEM_PROMPT}\n\nContext: {context}\n\n"
            "Write exactly 1 sentence of narration to be spoken aloud. Keep it under 20 words. Output ONLY that sentence.\n"
            "Rules:\n"
            "- No preamble, labels, or intro ('Here is...', 'Narration:', 'Scene 1:' etc.).\n"
            "- No technical identifiers, repo paths (owner/repo), file paths, or code-style names.\n"
            "- No parentheses, brackets, asterisks, or stage directions.\n"
            "- No mention of music, visuals, or the film itself.\n"
            "- No dates or years unless explicitly given in the Context — never guess.\n"
            "- No manner words ('warmly', 'boldly', 'dramatically') — just speak the narration.\n"
            "- Sound like a human speaking, not an AI writing. Use contractions, natural rhythm."
        )
        try:
            result = llm.invoke(prompt).content.strip()
            _check_cancelled(cancel_event)
            return result
        except CancelledError:
            raise
        except Exception:
            return fallback

    first_week  = analytics["commit_series"][0]["week"][:4]  if analytics.get("commit_series") else None
    latest_week = analytics["commit_series"][-1]["week"][:4] if analytics.get("commit_series") else None
    twist_week  = plot_twist_raw.get("week", "")[:4] if plot_twist_raw.get("week") else None

    context_map = {
        "S01": f"Repository '{repo_name}' started by {contributors[0]['login'] if contributors else 'unknown'}{f' in {first_week}' if first_week else ''}. {analytics['total_commits']} total commits.",
        "S02": f"Top contributors: {[c['login'] for c in contributors[:3]]}. {analytics['contributor_count']} total contributors.",
        "S03": f"Repository grew to {analytics['total_commits']} commits across {analytics['contributor_count']} contributors over {analytics['repo_age_days']} days.",
        "S04": f"Most dramatic week: {plot_twist_raw.get('commit_count', 0)} commits{f' in {twist_week}' if twist_week else ''}, type: {plot_twist_raw.get('type', 'spike')}.",
        "S05": f"Ghost files not touched in 180+ days: {ghost_files[:5]}",
        "S06": f"Biggest single commit: '{hero_raw.get('message', '')}' by {hero_raw.get('author_login', '')}. Changed {hero_raw.get('lines_changed', 0)} lines.",
        "S07": f"Final state{f' as of {latest_week}' if latest_week else ''}: {analytics['total_commits']} commits, {analytics['contributor_count']} contributors, primary language: {analytics.get('primary_language', 'unknown')}.",
        "plot_twist": str(plot_twist_raw),
        "hero":       str(hero_raw),
    }

    # Build all narrations in parallel — cuts agent phase from ~20s to ~3s
    narration_tasks = {
        scene_id: (context_map[scene_id], fallback)
        for scene_id, (_, _, fallback) in SCENE_TEMPLATES.items()
    }
    if plot_twist_raw.get("found"):
        narration_tasks["plot_twist"] = (context_map["plot_twist"], "Then everything changed.")
    narration_tasks["hero"] = (context_map["hero"], "One commit changed everything.")

    narrations: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=len(narration_tasks)) as executor:
        future_to_key = {
            executor.submit(narrate, key, ctx, fallback): key
            for key, (ctx, fallback) in narration_tasks.items()
        }
        for future in as_completed(future_to_key):
            key = future_to_key[future]
            _, fallback = narration_tasks[key]
            try:
                narrations[key] = future.result()
            except CancelledError:
                raise
            except Exception:
                narrations[key] = fallback

    # Build scenes
    scenes = []
    for scene_id, (title, duration, fallback) in SCENE_TEMPLATES.items():
        visual_params = {}
        if scene_id == "S03":
            visual_params = {"commit_series": commit_series, "eras": analytics.get("eras", [])}
        elif scene_id == "S06":
            visual_params = {"hero": hero_raw}

        scenes.append(Scene(
            scene_id=scene_id,
            title=title,
            duration_secs=duration,
            narration_text=narrations.get(scene_id, fallback),
            visual_params=visual_params,
        ))

    characters = [Character(**c) for c in contributors[:6]]

    plot_twist = None
    if plot_twist_raw.get("found"):
        plot_twist = PlotTwist(
            week=plot_twist_raw.get("week", ""),
            commit_count=plot_twist_raw.get("commit_count", 0),
            twist_type=plot_twist_raw.get("type", "spike"),
            narration_text=narrations.get("plot_twist", "Then everything changed."),
        )

    hero_commit = HeroCommit(
        sha=hero_raw.get("sha", ""),
        author_login=hero_raw.get("author_login", ""),
        message=hero_raw.get("message", ""),
        lines_changed=hero_raw.get("lines_changed", 0),
        timestamp=hero_raw.get("timestamp", ""),
        narration_text=narrations.get("hero", "One commit changed everything."),
        diff_excerpt=hero_raw.get("diff_excerpt"),
    )

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
