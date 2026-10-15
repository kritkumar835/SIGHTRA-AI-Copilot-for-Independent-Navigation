import os
import time
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env before initializing app components
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from backend.schemas import AnalyzeRequest, AnalyzeResponse, LiveDetectRequest, LiveDetectResponse
from backend.vision import get_vision_provider, VisionProviderError
from backend.detector import get_live_detector, decode_image_base64


# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sightguide.main")

app = FastAPI(
    title="DRISHTI-AI API",
    description="Mobile-first audio/vision assistant for visually impaired users.",
    version="1.0.0"
)

# Enable CORS for phone browsers and tunneling tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 1)
    if request.url.path.startswith("/api/"):
        logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")
    return response

@app.get("/api/health")
async def health_check():
    demo_mode = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    has_api_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    return {
        "status": "healthy",
        "demo_mode": demo_mode,
        "has_api_key": has_api_key,
        "model": model,
        "detector_ready": True,
        "service": "DRISHTI-AI"
    }

@app.post("/api/detect", response_model=LiveDetectResponse)
async def detect_live_frame(req: LiveDetectRequest):
    """Fast real-time live object detection endpoint for video stream frames."""
    if not req.image_base64:
        return LiveDetectResponse(
            objects=[],
            hazards=[],
            speech="Camera frame missing",
            object_count=0,
            demo=False
        )

    img = decode_image_base64(req.image_base64)
    if img is None:
        return LiveDetectResponse(
            objects=[],
            hazards=[],
            speech="Invalid image data",
            object_count=0,
            demo=False
        )

    detector = get_live_detector()
    result = detector.detect_frame(
        image_np=img,
        obstacles_enabled=bool(req.obstacles_enabled),
        threshold=req.confidence_threshold or 0.35
    )
    return result

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_image(req: AnalyzeRequest):
    img_len = len(req.image_base64)
    logger.info(f"Analyze request: mode={req.mode}, target='{req.target}', obstacles={req.obstacles_enabled}, scan_count={req.scan_count}, b64_len={img_len}")

    if not req.image_base64:
        return AnalyzeResponse(
            speech="Camera image missing, please try again.",
            confidence="low",
            found=False,
            mode=req.mode,
            demo=False
        )

    # For detect/live mode, route directly to fast detector if requested or vision provider
    if req.mode in ("detect", "live"):
        img = decode_image_base64(req.image_base64)
        if img is not None:
            det = get_live_detector().detect_frame(img, obstacles_enabled=bool(req.obstacles_enabled))
            return AnalyzeResponse(
                speech=det.speech,
                confidence="high",
                found=len(det.objects) > 0,
                direction_clock=det.closest_object.direction_clock if det.closest_object else "12 o'clock",
                distance_hint=det.closest_object.distance if det.closest_object else "about 2 steps away",
                detected_text=None,
                detected_objects=det.objects,
                hazards=det.hazards,
                mode="detect",
                demo=False
            )

    provider = get_vision_provider()
    try:
        response = await provider.analyze(
            image_base64=req.image_base64,
            mode=req.mode,
            target=req.target,
            obstacles_enabled=bool(req.obstacles_enabled),
            scan_count=req.scan_count or 0
        )
        return response
    except VisionProviderError as e:
        logger.error(f"Vision provider error: {e}")
        # Always return graceful spoken fallback as required
        return AnalyzeResponse(
            speech="I couldn't process that, please try again.",
            confidence="low",
            found=False,
            mode=req.mode,
            demo=False
        )
    except Exception as e:
        logger.exception(f"Unexpected error during analysis: {e}")
        return AnalyzeResponse(
            speech="I couldn't process that, please try again.",
            confidence="low",
            found=False,
            mode=req.mode,
            demo=False
        )


# Mount frontend directory if it exists
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
