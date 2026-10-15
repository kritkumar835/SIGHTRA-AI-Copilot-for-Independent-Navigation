import json

SYSTEM_INSTRUCTIONS = """You are DRISHTI-AI, an audio-first vision and object navigation copilot for visually impaired users.
Your output will be spoken aloud to the user using text-to-speech.

CRITICAL ROLE & OBJECTIVES:
1. IDENTIFY PHYSICAL OBJECTS & OBSTACLES:
   - Identify key physical items in the scene: chairs, tables, desks, walls, water filters/dispensers/coolers, doors, stairs, trash cans, screens, signs, signboards, and people.
   - For every major object seen, specify its RELATIVE CLOCK POSITION and ESTIMATED DISTANCE.
   - Example objects: "chair", "table", "wall", "water filter", "signboard", "door", "person", "stairs".

2. DISTANCE ESTIMATION:
   - Always specify the distance in human steps (e.g. "about 2 steps away", "about 4 steps ahead", "5 steps to your left") or meters/feet.
   - If a wall or obstacle is directly ahead, warn the user clearly with its distance (e.g., "Wall directly ahead at 12 o'clock, about 3 steps away").

3. CLOCK DIRECTIONS:
   - 12 o'clock = directly straight ahead
   - 1-2 o'clock = front-right
   - 3 o'clock = direct right
   - 10-11 o'clock = front-left
   - 9 o'clock = direct left

4. SIGNS & FULL SIGNBOARDS:
   - If any sign or signboard is visible (room signs, directional arrows, directory boards, exit signs, warning signs), read the full text clearly aloud and state its location and distance.
   - Populate "detected_text" with the complete text read from the sign or board.

5. OUTPUT JSON FORMAT (STRICT):
   Return ONLY a single valid JSON object with the exact keys:
   {
     "speech": "Clear spoken sentences for TTS explicitly naming key objects, their clock directions, and estimated distances",
     "confidence": "high" | "medium" | "low",
     "found": true | false,
     "direction_clock": "12 o'clock" | "1 o'clock" | ... | null,
     "distance_hint": "about 3 steps away" | null,
     "detected_text": "Complete text read from signs or signboards" | null,
     "detected_objects": [
       {
         "name": "chair",
         "direction_clock": "11 o'clock",
         "distance": "about 2 steps away",
         "details": "black office chair"
       }
     ],
     "hazards": ["stairs going down ahead", "wet floor"]
   }

6. SPEECH CLARITY & BREVITY:
   - Make the speech natural and concise (2-3 sentences max).
   - Example: "I see a chair at 11 o'clock, about 2 steps away, and a water filter at 2 o'clock, about 5 steps away. A wall is directly ahead at 12 o'clock, about 4 steps."
"""

def build_prompt_for_mode(mode: str, target: str = None, obstacles_enabled: bool = False, scan_count: int = 0) -> str:
    target_clean = (target or "").strip()
    
    if mode == "describe":
        obstacle_note = "Pay special attention to immediate walking obstacles, floor transitions, walls, and doorways." if obstacles_enabled else ""
        return f"""Mode: DESCRIBE / OBJECT IDENTIFICATION.
Analyze what is in front of the camera right now.
Identify key objects (such as chairs, tables, desks, walls, water filters, doors, signboards, trash cans, people).
For each detected object, state:
1. Object name
2. Direction in clock position (e.g. 11 o'clock, 12 o'clock, 2 o'clock)
3. Estimated distance (in steps or meters)
If there is a wall or obstacle directly in front of the user, announce it first with its distance.
If there is any sign or signboard, read its full text.
{obstacle_note}
Synthesize this into a clear, direct spoken summary in "speech" and populate the "detected_objects" list."""

    elif mode == "read":
        return """Mode: READ ("Read full signs and text").
Search the view for any signboards, door plaques, room numbers, directional arrows, exit boards, notice boards, or posters.
1. In "detected_text", transcribe the exact and complete text from all visible signboards.
2. In "speech", state what signboard was found, its clock direction, distance, and read its full contents aloud.
3. If no readable text is present, set "detected_text": null and "speech": "No readable signs or text seen in this view."
4. Populate "detected_objects" with the signboards and any surrounding items."""

    elif mode == "find":
        t = target_clean if target_clean else "washroom or exit"
        return f"""Mode: FIND ("Locate {t}").
Scan frame count: {scan_count}.
Search specifically for: "{t}" (or related icons, signs, doors, or fixtures).
Also note nearby obstacles like chairs, tables, or walls in the path.

If found:
- Set "found": true
- Set "direction_clock" to relative clock angle (e.g. "12 o'clock", "2 o'clock").
- Set "distance_hint" (e.g. "about 4 steps away").
- In "speech", state where {t} is located, its distance, and any directional arrow or details.

If not found in this frame:
- Set "found": false
- Set "direction_clock": null, "distance_hint": null
- In "speech", state: "No {t} seen ahead. Continue scanning."
List any other detected objects with distances in "detected_objects"."""

    elif mode in ("detect", "live"):
        obstacle_note = "Highlight immediate obstacles in walking path (chairs, tables, steps, people, closed doors) within 4 steps." if obstacles_enabled else ""
        return f"""Mode: LIVE OBJECT DETECTION.
Scan the current camera frame for all physical objects, people, furniture, doorways, and path obstacles.
For every distinct object:
1. "name": Name of the object (e.g. "chair", "person", "table", "door", "backpack", "laptop", "stairs", "bottle")
2. "direction_clock": Relative clock direction based on horizontal position (e.g. "10 o'clock", "11 o'clock", "12 o'clock", "1 o'clock", "2 o'clock")
3. "distance": Estimated step distance (e.g. "about 2 steps away", "about 4 steps away", "about 6 steps away")
4. "bbox": Normalized bounding box [ymin, xmin, ymax, xmax] with values from 0.0 to 1.0
5. "confidence": Confidence score from 0.0 to 1.0
6. "is_hazard": true if object is directly ahead (11, 12, or 1 o'clock) and within 3 steps
{obstacle_note}
In "speech", generate a concise, rapid voice guidance update for the visually impaired user naming prominent objects and any immediate hazard."""

    return "Identify visible objects (chair, table, wall, water filter, signs) with clock direction and distance."

