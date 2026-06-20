"""
LLM Load Balancer — round-robin across Groq models with automatic fallback.

Model priority order:
  1. llama-3.1-8b-instant    (fast, default)
  2. llama-3.3-70b-versatile (slower but more capable, used when 8b fails)

Configure via .env:
  GROQ_API_KEY=...   # required
"""

import itertools
import os

from langchain_groq import ChatGroq

_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]


class LLMLoadBalancer:
    """
    Round-robin load balancer across Groq models with fallback on failure.
    Models are instantiated once and reused across calls.

    Usage:
        balancer = LLMLoadBalancer(temperature=0.7)
        result = balancer.invoke("your prompt")
        text = result.content.strip()
    """

    def __init__(self, temperature: float = 0.7):
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set in environment.")
        self._models = [
            ChatGroq(model=m, temperature=temperature, api_key=api_key)
            for m in _MODELS
        ]
        self._cycle = itertools.cycle(self._models)

    def invoke(self, prompt: str):
        """Try models in round-robin order; fall back to next on failure."""
        errors = []
        for _ in range(len(self._models)):
            llm = next(self._cycle)
            try:
                return llm.invoke(prompt)
            except Exception as e:
                errors.append(f"{llm.model_name}: {e}")
        raise RuntimeError("All models failed:\n" + "\n".join(errors))
