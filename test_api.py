import httpx
import json

BASE_URL = "http://localhost:8000"

def test_all():
    print("--- 1. Testing /api/health ---")
    r = httpx.get(f"{BASE_URL}/api/health")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n--- 2. Testing DESCRIBE mode ---")
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "mode": "describe",
        "obstacles_enabled": False
    }
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert "speech" in res
    assert res["mode"] == "describe"

    print("\n--- 3. Testing READ mode ---")
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "mode": "read"
    }
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert res["detected_text"] is not None

    print("\n--- 4. Testing FIND mode (washroom - scanning scan 1) ---")
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "mode": "find",
        "target": "washroom",
        "scan_count": 1
    }
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert res["found"] is False

    print("\n--- 5. Testing FIND mode (washroom - target found on scan 2) ---")
    payload["scan_count"] = 2
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert res["found"] is True
    assert "2 o'clock" in res["direction_clock"] or "restroom" in res["speech"].lower()

    print("\n--- 6. Testing FIND mode (exit) ---")
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "mode": "find",
        "target": "exit",
        "scan_count": 2
    }
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert res["found"] is True

    print("\n--- 7. Testing OBSTACLE warning detection ---")
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "mode": "describe",
        "obstacles_enabled": True,
        "scan_count": 2
    }
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert len(res["hazards"]) > 0 or "stairs" in res["speech"].lower()

    print("\n--- 8. Testing /api/detect (Live Real-Time Object Detection) ---")
    import io, base64
    from PIL import Image
    test_img = Image.new("RGB", (320, 240), color=(128, 128, 128))
    buf = io.BytesIO()
    test_img.save(buf, format="JPEG")
    valid_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

    payload = {
        "image_base64": valid_b64,
        "obstacles_enabled": True,
        "confidence_threshold": 0.35
    }
    r = httpx.post(f"{BASE_URL}/api/detect", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert "objects" in res
    assert "speech" in res
    assert res["object_count"] >= 0

    print("\n--- 9. Testing mode='detect' in /api/analyze ---")
    payload = {
        "image_base64": valid_b64,
        "mode": "detect",
        "obstacles_enabled": True
    }
    r = httpx.post(f"{BASE_URL}/api/analyze", json=payload)
    print(r.status_code, json.dumps(r.json(), indent=2))
    assert r.status_code == 200
    res = r.json()
    assert res["mode"] == "detect"
    assert "speech" in res

    print("\n ALL BACKEND ACCEPTANCE TESTS PASSED!")

if __name__ == "__main__":
    test_all()

