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

from backend.schemas import AnalyzeRequest, AnalyzeResponse
from backend.vision import get_vision_provider, VisionProviderError

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sightguide.main")

app = FastAPI(
    title="SightGuide API",
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
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    return {
        "status": "healthy",
        "demo_mode": demo_mode,
        "has_api_key": has_api_key,
        "model": model,
        "service": "SightGuide"
    }

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
