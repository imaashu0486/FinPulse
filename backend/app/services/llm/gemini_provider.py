import time
import logging
from typing import Optional, Dict, Any

from app.core.config import settings
from app.services.llm.provider import BaseLLMProvider, LLMGenerationResult

logger = logging.getLogger(__name__)

class GoogleGeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL or "gemini-1.5-flash"
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key and self.api_key.strip():
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key.strip())
                logger.info(f"Initialized Google Gemini Client for model: {self.model_name}")
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI Client: {e}")
                self._client = None

    def is_available(self) -> bool:
        return self._client is not None

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
    ) -> LLMGenerationResult:
        t0 = time.time()
        
        # Guard: If API key not set or client unavailable
        if not self.is_available():
            elapsed = (time.time() - t0) * 1000
            return LLMGenerationResult(
                text="",
                model_name="Fallback (No LLM Configured)",
                is_generative=False,
                latency_ms=round(elapsed, 2),
                fallback_reason="AI generation unavailable — showing retrieved evidence instead."
            )

        # Retry logic with backoff
        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                config: Dict[str, Any] = {
                    "temperature": max(0.0, min(1.0, temperature)),
                    "max_output_tokens": max_output_tokens,
                }
                if system_instruction:
                    config["system_instruction"] = system_instruction

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )

                elapsed = (time.time() - t0) * 1000
                tokens = {}
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    meta = response.usage_metadata
                    tokens = {
                        "prompt_tokens": getattr(meta, "prompt_token_count", 0),
                        "candidates_tokens": getattr(meta, "candidates_token_count", 0),
                        "total_tokens": getattr(meta, "total_token_count", 0)
                    }

                return LLMGenerationResult(
                    text=response.text or "",
                    model_name=f"Google {self.model_name}",
                    is_generative=True,
                    latency_ms=round(elapsed, 2),
                    token_usage=tokens if tokens else None
                )

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Gemini generation attempt {attempt + 1} failed: {e}")
                if attempt < max_retries:
                    time.sleep(0.5 * (attempt + 1))

        elapsed = (time.time() - t0) * 1000
        return LLMGenerationResult(
            text="",
            model_name=f"Google {self.model_name} (Failed)",
            is_generative=False,
            latency_ms=round(elapsed, 2),
            fallback_reason=f"AI generation unavailable — showing retrieved evidence instead. ({last_error})"
        )

# Global LLM provider instance
llm_provider = GoogleGeminiProvider()
