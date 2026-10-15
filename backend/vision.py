import os
import json
import logging
import asyncio
import base64
from pathlib import Path
from typing import Optional, Dict, Any
import httpx

from backend.schemas import AnalyzeResponse
from backend.prompts import SYSTEM_INSTRUCTIONS, build_prompt_for_mode

logger = logging.getLogger("sightguide.vision")

DEMO_DATA_DIR = Path(__file__).parent / "demo_data"

class VisionProviderError(Exception):
    """Custom exception for vision provider failures."""
    pass

class BaseVisionProvider:
    async def analyze(
        self,
        image_base64: str,
        mode: str,
        target: Optional[str] = None,
        obstacles_enabled: bool = False,
        scan_count: int = 0
    ) -> AnalyzeResponse:
        raise NotImplementedError

class GeminiVisionProvider(BaseVisionProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model or "gemini-2.5-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def analyze(
        self,
        image_base64: str,
        mode: str,
        target: Optional[str] = None,
        obstacles_enabled: bool = False,
        scan_count: int = 0
    ) -> AnalyzeResponse:
        # Strip header if present (e.g. data:image/jpeg;base64,)
        clean_b64 = image_base64
        mime_type = "image/jpeg"
        if "," in clean_b64:
            header, clean_b64 = clean_b64.split(",", 1)
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"

        user_prompt = build_prompt_for_mode(mode, target, obstacles_enabled, scan_count)
        full_system = SYSTEM_INSTRUCTIONS

        payload = {
            "system_instruction": {
                "parts": [{"text": full_system}]
            },
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": clean_b64
                            }
                        },
                        {
                            "text": user_prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"

        # Timeout 8s, retry once
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code != 200:
                        logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
                        if attempt == 0 and resp.status_code in (429, 500, 503):
                            await asyncio.sleep(1.0)
                            continue
                        raise VisionProviderError(f"API error: status {resp.status_code}")

                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise VisionProviderError("No response candidates returned from Gemini.")

                    raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    clean_text = raw_text.strip()
                    if clean_text.startswith("```json"):
                        clean_text = clean_text[7:]
                    elif clean_text.startswith("```"):
                        clean_text = clean_text[3:]
                    if clean_text.endswith("```"):
                        clean_text = clean_text[:-3]
                    clean_text = clean_text.strip()

                    parsed = json.loads(clean_text)
                    
                    speech = parsed.get("speech", "No description available.")
                    confidence = parsed.get("confidence", "high").lower()
                    if confidence not in ("high", "medium", "low"):
                        confidence = "medium"

                    # Hedging check if confidence is low and speech does not already hedge
                    if confidence == "low" and not any(h in speech.lower() for h in ["i think", "might be", "not sure", "appears to"]):
                        speech = f"I'm not completely sure, but {speech[0].lower() + speech[1:] if len(speech) > 1 else speech}"

                    return AnalyzeResponse(
                        speech=speech,
                        confidence=confidence,
                        found=bool(parsed.get("found", False)),
                        direction_clock=parsed.get("direction_clock"),
                        distance_hint=parsed.get("distance_hint"),
                        detected_text=parsed.get("detected_text"),
                        hazards=parsed.get("hazards", []),
                        mode=mode,
                        demo=False
                    )
            except (httpx.RequestError, asyncio.TimeoutError) as e:
                logger.warning(f"Attempt {attempt+1} network error: {e}")
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue
                raise VisionProviderError(f"Network timeout contacting Gemini: {e}")
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}, text was: {clean_text}")
                raise VisionProviderError("Failed to parse JSON response from vision model")

        raise VisionProviderError("Max retries exceeded")

class DemoVisionProvider(BaseVisionProvider):
    """Returns canned responses for offline testing, demos, or fallback."""
    def __init__(self, demo_dir: Path = DEMO_DATA_DIR):
        self.demo_dir = demo_dir
        self.find_toggle_state: Dict[str, int] = {}

    def _load_canned(self, filename: str) -> Dict[str, Any]:
        path = self.demo_dir / filename
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "speech": "Demo scene: Hallway ahead, door at 2 o'clock, 4 steps away.",
            "confidence": "high",
            "found": False,
            "direction_clock": "2 o'clock",
            "distance_hint": "about 4 steps away",
            "detected_text": None,
            "hazards": [],
            "mode": "describe",
            "demo": True
        }

    async def analyze(
        self,
        image_base64: str,
        mode: str,
        target: Optional[str] = None,
        obstacles_enabled: bool = False,
        scan_count: int = 0
    ) -> AnalyzeResponse:
        # Simulate slight network delay (250ms) for realistic UX
        await asyncio.sleep(0.25)

        target_str = (target or "").lower()

        if obstacles_enabled and scan_count % 3 == 2:
            data = self._load_canned("obstacle_hazard.json")
            return AnalyzeResponse(**data)

        if mode == "describe":
            data = self._load_canned("describe.json")
            return AnalyzeResponse(**data)

        elif mode == "read":
            data = self._load_canned("read.json")
            return AnalyzeResponse(**data)

        elif mode == "find":
            # If target is washroom/restroom
            if any(w in target_str for w in ["washroom", "restroom", "toilet", "bath"]):
                # Found after 2-3 frames
                if scan_count >= 2:
                    data = self._load_canned("find_washroom_found.json")
                else:
                    data = self._load_canned("find_washroom_not_found.json")
            elif "exit" in target_str:
                if scan_count >= 2:
                    data = self._load_canned("find_exit_found.json")
                else:
                    data = {
                        "speech": "Scanning for exit. Keep turning slowly.",
                        "confidence": "high",
                        "found": False,
                        "direction_clock": None,
                        "distance_hint": None,
                        "detected_text": None,
                        "hazards": [],
                        "mode": "find",
                        "demo": True
                    }
            else:
                # Custom target
                if scan_count >= 3:
                    data = {
                        "speech": f"{target.capitalize() if target else 'Target'} sign detected at 1 o'clock, about 6 steps away.",
                        "confidence": "high",
                        "found": True,
                        "direction_clock": "1 o'clock",
                        "distance_hint": "about 6 steps away",
                        "detected_text": target.upper() if target else "FOUND",
                        "hazards": [],
                        "mode": "find",
                        "demo": True
                    }
                else:
                    data = {
                        "speech": f"No {target or 'target'} seen yet. Continue scanning.",
                        "confidence": "high",
                        "found": False,
                        "direction_clock": None,
                        "distance_hint": None,
                        "detected_text": None,
                        "hazards": [],
                        "mode": "find",
                        "demo": True
                    }
            return AnalyzeResponse(**data)

        data = self._load_canned("describe.json")
        return AnalyzeResponse(**data)

# Provider factory
def get_vision_provider() -> BaseVisionProvider:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    demo_mode_str = os.getenv("DEMO_MODE", "false").strip().lower()
    demo_mode = demo_mode_str in ("true", "1", "yes")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if demo_mode or not api_key:
        logger.info("Using DemoVisionProvider (DEMO_MODE=True or GEMINI_API_KEY unset).")
        return DemoVisionProvider()

    logger.info(f"Using GeminiVisionProvider with model '{model}'.")
    return GeminiVisionProvider(api_key=api_key, model=model)
