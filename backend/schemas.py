from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

class DetectedObject(BaseModel):
    name: str = Field(..., description="Name of the object, e.g. 'chair', 'table', 'wall', 'water filter', 'signboard'")
    direction_clock: Optional[str] = Field(None, description="Clock direction e.g. '11 o\\'clock', '12 o\\'clock'")
    distance: Optional[str] = Field(None, description="Estimated distance e.g. 'about 2 steps away'")
    details: Optional[str] = Field(None, description="Optional extra detail or text read")
    bbox: Optional[List[float]] = Field(None, description="Bounding box [ymin, xmin, ymax, xmax] normalized (0.0 to 1.0)")
    confidence: Optional[float] = Field(None, description="Confidence score between 0.0 and 1.0")
    is_hazard: Optional[bool] = Field(False, description="Whether this object is an immediate obstacle in path")

class AnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG or PNG image (with or without data URI header)")
    mode: Literal["describe", "read", "find", "detect", "live"] = Field("describe", description="Active mode: describe, read, find, detect, or live")
    target: Optional[str] = Field(None, description="Target object or room to look for in find mode (e.g., 'washroom', 'exit')")
    obstacles_enabled: Optional[bool] = Field(False, description="Flag indicating if obstacle/hazard detection is enabled")
    scan_count: Optional[int] = Field(0, description="In find mode: number of scan frames taken so far")

class AnalyzeResponse(BaseModel):
    speech: str = Field(..., description="Spoken sentences formatted for screen readers and TTS")
    confidence: Literal["high", "medium", "low"] = Field("high", description="Confidence level of detection")
    found: bool = Field(False, description="Whether target was found (primarily for find mode)")
    direction_clock: Optional[str] = Field(None, description="Clock position, e.g., '2 o\\'clock', '12 o\\'clock'")
    distance_hint: Optional[str] = Field(None, description="Distance estimate, e.g., 'about 4 steps away'")
    detected_text: Optional[str] = Field(None, description="Exact text read from signs/labels in read mode")
    detected_objects: List[DetectedObject] = Field(default_factory=list, description="Structured list of objects detected with distance, direction, and bounding boxes")
    hazards: List[str] = Field(default_factory=list, description="List of immediate hazards detected (e.g. stairs, obstacles, wet floor)")
    mode: str = Field("describe", description="Mode used for processing")
    demo: bool = Field(False, description="Whether this response came from canned demo data")

class LiveDetectRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded frame from camera stream")
    obstacles_enabled: Optional[bool] = Field(True, description="Enable obstacle alerts")
    confidence_threshold: Optional[float] = Field(0.35, description="Minimum confidence threshold")

class LiveDetectResponse(BaseModel):
    objects: List[DetectedObject] = Field(default_factory=list, description="All detected objects with clock directions and bounding boxes")
    hazards: List[str] = Field(default_factory=list, description="Immediate collision warnings or hazards")
    closest_object: Optional[DetectedObject] = Field(None, description="Closest obstacle or object detected")
    speech: str = Field("", description="Audio alert to speak for blind navigation")
    object_count: int = Field(0, description="Total number of objects detected")
    demo: bool = Field(False, description="Whether fallback demo mode was used")
