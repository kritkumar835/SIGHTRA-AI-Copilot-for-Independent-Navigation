# SightGuide 👁️🎙️
> **Mobile-First, Audio-First AI Vision Assistant for Visually Impaired Users**

SightGuide helps blind and low-vision individuals navigate unfamiliar buildings, understand their immediate physical surroundings, read door plaques and directional signs, and locate washrooms or emergency exits using a hands-free, voice-guided interface.

---

## 🌟 Key Features

1. **DESCRIBE ("What's around me")**:
   - Concise 1–2 spoken sentence description of nearby physical objects, layout, and obstacles.
   - Grounded orientation using **clock positions** (e.g., *"Door at 2 o'clock, about 4 steps away"*).
2. **READ ("Read this")**:
   - Accurate OCR of directional signs, door plaques, room numbers, and labels.
   - Speaks exact text followed by directional arrow context (e.g., *"Restrooms with arrow pointing right, Room 204 directly ahead"*).
   - Honestly hedges if text is partially obscured or low confidence.
3. **FIND (Guided Scanning Loop — Hero Feature)**:
   - Voice trigger: *"Find washroom"*, *"Find exit"*, or *"Find <target>"*.
   - Auditory turn guidance: *"Finding washroom. Slowly turn left."*
   - Captures and analyzes camera frames every ~2.5 seconds.
   - Upon detection: Announces target location with clock direction and step distance, accompanied by a double-buzz haptic and triumphant chime.
   - Fallback: If not located after ~8 frames, gracefully informs the user and suggests turning around or requesting sighted assistance.
4. **OBSTACLE ALERT (Toggleable Safety Aid)**:
   - Identifies downward stairs, drop-offs, wet floor signs, glass doors, and ground-level obstacles.
   - Immediate distinct high-priority alert buzz and audio earcon.
   - *Framed strictly as an auxiliary aid that complements—never replaces—a white cane or guide dog.*
5. **Hands-Free & Audio-First Accessibility**:
   - **Full-screen tap anywhere** to start or cancel voice commands.
   - **Interruptible speech**: Any new command or "Stop" cancels ongoing audio instantly.
   - **Web Audio Earcues**: Synthesized tones for listening start, processing tick, target found, and hazard alert.
   - **Haptic Feedback**: Short buzz on command heard, double buzz on target found, urgent long buzz on obstacle.
   - **Repeat & Help**: Say *"Repeat"* to hear the last announcement; say *"Help"* for command syntax.
   - **Persistent Visual Transcript**: Live scrollable feed of spoken dialogue for judges, evaluators, and sighted helpers.

---

## 📁 Project Structure

```text
sightguide/
├── backend/
│   ├── main.py          # FastAPI server, endpoints, request logging, static mount
│   ├── vision.py        # Swappable vision provider (Gemini 2.5/1.5 & Demo fallback)
│   ├── prompts.py       # Mode-specific prompts with clock orientation & strict JSON schema
│   ├── schemas.py       # Pydantic request & response models
│   └── demo_data/       # Realistic pre-canned JSON responses for offline demoing
│       ├── describe.json
│       ├── read.json
│       ├── find_washroom_found.json
│       ├── find_washroom_not_found.json
│       ├── find_exit_found.json
│       └── obstacle_hazard.json
├── frontend/
│   ├── index.html       # Accessible HTML5 structure, ARIA live log, camera reticle
│   ├── styles.css       # Obsidian high-contrast theme, min 64px touch targets
│   └── js/
│       ├── earcues.js   # Web Audio API synthesized tones
│       ├── haptics.js   # Navigator vibration feedback patterns
│       ├── camera.js    # Rear camera stream & 640px JPEG client-side downscaler
│       ├── speech.js    # SpeechRecognition + interruptible SpeechSynthesis
│       ├── modes.js     # Mode coordinator & guided FIND scanning state machine
│       └── app.js       # Voice intent parser, touch gestures, and transcript UI
├── .env.example         # Environment template
├── requirements.txt     # Python dependencies
└── README.md            # Setup, demo script, HTTPS tunneling & limitations
```

---

## 🚀 Quickstart & Local Execution

### 1. Requirements
- Python 3.11+
- Chrome, Safari, or Edge browser (desktop or mobile)

### 2. Setup Environment
```bash
# Clone or navigate to the project directory
cd d:/project/SIGHTRA

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Gemini Vision (Optional for live LLM)
Copy `.env.example` to `.env`:
```ini
# Add your Gemini API key (from Google AI Studio):
GEMINI_API_KEY=your_actual_gemini_api_key_here

# When false and key is provided, calls live Gemini 2.5 Flash
DEMO_MODE=false
```
*Note: If `GEMINI_API_KEY` is empty or `DEMO_MODE=true`, SightGuide automatically operates using the offline `DemoVisionProvider`, enabling complete demo functionality without internet or API credentials.*

### 4. Start the Application Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open **`http://localhost:8000`** in your browser.

---

## 📱 Running on a Mobile Phone (HTTPS Tunneling)

Modern mobile browsers (iOS Safari, Android Chrome) **require a secure origin (`https://`)** to grant access to the rear camera (`getUserMedia`) and microphone (`SpeechRecognition`).

### Option A: Cloudflare Tunnels (Recommended — Instant & Free)
1. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/):
   ```bash
   winget install Cloudflare.cloudflared
   ```
2. Start an ad-hoc HTTPS tunnel to your local server:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
3. Copy the generated `https://*.trycloudflare.com` URL and open it on your phone's browser.

### Option B: ngrok
1. Run:
   ```bash
   ngrok http 8000
   ```
2. Open the resulting `https://<id>.ngrok-free.app` URL on your smartphone.

### Option C: Chrome Desktop Emulation / Local Network
If testing locally on the same Wi-Fi network, navigate to `http://<your-computer-ip>:8000`. On Chrome desktop or Android, you can allow insecure origins for camera testing via `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.

---

## ⏱️ 2-Minute Judge & Evaluator Demo Script

Follow this sequence to showcase every core feature in under two minutes:

| Step | Action | Spoken / Visual Outcome | Feature Highlight |
|---|---|---|---|
| **0:00** | Open app on phone or browser | SightGuide announces: *"SightGuide ready. Tap anywhere or say describe, read, or find washroom."* | Audio-first onboarding, clean obsidian UI. |
| **0:15** | Tap anywhere and say: **"Describe"** (or tap **👁️ Describe**) | Takes a camera frame, plays processing tick, speaks: *"Hallway ahead. Closed wooden door at 2 o'clock, about 4 steps away. Water cooler at 10 o'clock."* | Spatial orientation with clock positions and distance. |
| **0:40** | Point camera at a door or sign, say: **"Read this"** (or tap **📖 Read Sign**) | Assistant speaks exact text: *"Restrooms with arrow pointing right, and Room 204 directly ahead."* | High-precision signage OCR. |
| **1:05** | Tap and say: **"Find washroom"** (or tap **🚻 Find Washroom**) | Assistant announces: *"Finding washroom. Slowly turn left."* Camera displays cyan radar sweep overlay. Captures scanning frames every 2.5s. | Guided 360° navigation loop. |
| **1:20** | Washroom sign enters field of view | Haptic double-buzz vibrates, double-chime earcue plays, assistant speaks: *"Restroom sign at 2 o'clock, pointing right, about 5 steps away."* Scanning terminates automatically. | Real-time target acquisition. |
| **1:40** | Tap **⚠️ Obstacles** button | Assistant announces: *"Obstacle warnings enabled. Remember, this is an aid and does not replace your cane or guide dog."* Long buzz triggers if hazard detected. | Safety aid toggle with clear disclaimer. |
| **1:55** | Say **"Repeat"** or tap **⏹️ Stop** | Re-speaks the latest response or immediately halts active speech. | Full interruptibility & accessibility compliance. |

---

## 🔒 Honest Limitations & Safety Disclaimer

> [!WARNING]
> **Safety Notice**: SightGuide is an experimental assistive aid powered by computer vision and multimodal machine learning.
> 1. **Not a Life-Safety Device**: SightGuide does **NOT** replace a white cane, guide dog, or mobility training. It should never be used as a primary tool for collision prevention or drop-off detection.
> 2. **Lighting & Optical Dependence**: Vision accuracy degrades under dim lighting, extreme glare, fast camera motions, or motion blur.
> 3. **Latency & Connectivity**: In live API mode, response times depend on network bandwidth and LLM roundtrips (typically 1.2–2.5 seconds).
> 4. **No Guarantee of Absolute Safety**: The model is strictly instructed never to assert that an area is "completely clear" or "safe". Visually impaired users must rely on physical touch and auditory cues for navigation certainty.

---

## 🧪 Testing & Verification

A dedicated verification test suite is included:
```bash
# Run backend acceptance tests against the live endpoint
python test_api.py
```
**Verification Results**:
- `GET /api/health` ➔ 200 OK
- `POST /api/analyze` [DESCRIBE] ➔ 200 OK (clock positions & distance hints)
- `POST /api/analyze` [READ] ➔ 200 OK (verbatim text & direction context)
- `POST /api/analyze` [FIND washroom] ➔ 200 OK (scanning state machine & target detection)
- `POST /api/analyze` [FIND exit] ➔ 200 OK (emergency exit detection)
- `POST /api/analyze` [OBSTACLE] ➔ 200 OK (downward stairs hazard alert)
