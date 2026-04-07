"""
LLM Load Balancer — round-robin across Groq models with automatic fallback.

Model priority order:
  1. llama-3.1-8b-instant   (fast, default)
  2. llama-3.3-70b-versatile (slower but more capable, used when 8b fails)

Configure via .env:
  GROQ_API_KEY=...   # required
"""

import os
import itertools
from langchain_groq import ChatGroq

_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]


class LLMLoadBalancer:
    """
    Round-robin load balancer across Groq models with fallback on failure.

    Usage:
        balancer = LLMLoadBalancer(temperature=0.7)
        result = balancer.invoke("your prompt")
        text = result.content.strip()
    """

    def __init__(self, temperature: float = 0.7):
        self._api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not self._api_key:
            raise RuntimeError("GROQ_API_KEY not set in environment.")
        self._temperature = temperature
        self._model_cycle = itertools.cycle(_MODELS)

    def invoke(self, prompt: str):
        """Try models in round-robin order; fall back to next on failure."""
        errors = []
        for model in _MODELS:
            # advance the cycle so next call starts from the next model
            next(self._model_cycle)
            try:
                llm = ChatGroq(
                    model=model,
                    temperature=self._temperature,
                    api_key=self._api_key,
                )
                return llm.invoke(prompt)
            except Exception as e:
                print(f"[LLMBalancer] {model} failed: {type(e).__name__}: {e}")
                errors.append(f"{model}: {e}")

        raise RuntimeError(
            f"All models failed:\n" + "\n".join(errors)
        )
