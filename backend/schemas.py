from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class AnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG or PNG image (with or without data URI header)")
    mode: Literal["describe", "read", "find"] = Field("describe", description="Active mode: describe, read, or find")
    target: Optional[str] = Field(None, description="Target object or room to look for in find mode (e.g., 'washroom', 'exit')")
    obstacles_enabled: Optional[bool] = Field(False, description="Flag indicating if obstacle/hazard detection is enabled")
    scan_count: Optional[int] = Field(0, description="In find mode: number of scan frames taken so far")

class AnalyzeResponse(BaseModel):
    speech: str = Field(..., description="1-2 short spoken sentences formatted for screen readers and TTS")
    confidence: Literal["high", "medium", "low"] = Field("high", description="Confidence level of detection")
    found: bool = Field(False, description="Whether target was found (primarily for find mode)")
    direction_clock: Optional[str] = Field(None, description="Clock position, e.g., '2 o\\'clock', '12 o\\'clock'")
    distance_hint: Optional[str] = Field(None, description="Distance estimate, e.g., 'about 4 steps away'")
    detected_text: Optional[str] = Field(None, description="Exact text read from signs/labels in read mode")
    hazards: List[str] = Field(default_factory=list, description="List of immediate hazards detected (e.g. stairs, obstacles, wet floor)")
    mode: str = Field("describe", description="Mode used for processing")
    demo: bool = Field(False, description="Whether this response came from canned demo data")
