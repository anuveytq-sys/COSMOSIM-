import os
import json
from flask import Flask, render_template, request, jsonify, Response
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


@app.route("/")
def home():
    # Keep the existing COSMOSIM page intact and inject the Interstellar Flight
    # upgrade as an isolated module. Other menu simulations continue to use the
    # original renderer and controls.
    page_path = os.path.join(app.static_folder, "index.html")
    with open(page_path, "r", encoding="utf-8") as handle:
        html = handle.read()
    tag = '<script type="module" src="/static/interstellar-flight.js"></script>'
    if tag not in html:
        html = html.replace("</body>", f"{tag}</body>")
    return Response(html, mimetype="text/html")


@app.route("/api/command", methods=["POST"])
def command():
    data = request.get_json(silent=True) or {}
    text = str(data.get("command", "")).strip()[:1000]

    if not text:
        return jsonify({"error": "Enter a space command first."}), 400

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key:
        return jsonify({
            "mode": "local",
            "description": "Local demo settings applied. Add your Gemini key for AI command interpretation.",
            "mass": 10,
            "disk": True,
            "distance": 7,
            "speed": 1
        })

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = f"""
You control a visual black-hole educational simulation.
Convert the user's request into JSON only, with these keys:
mass (number from 3 to 50, in solar masses),
disk (boolean),
distance (number from 4 to 20, in arbitrary scene units),
speed (number from 0.2 to 3),
description (short plain-language explanation).
Do not claim this simple visualization is a full general relativity simulation.
For requests about other objects, adapt the black-hole scene as reasonably as possible.
User request: {text}
"""
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        result = json.loads(response.text)
        result["mass"] = max(3, min(50, float(result.get("mass", 10))))
        result["distance"] = max(4, min(20, float(result.get("distance", 7))))
        result["speed"] = max(0.2, min(3, float(result.get("speed", 1))))
        result["disk"] = bool(result.get("disk", True))
        result["description"] = str(result.get("description", "Simulation updated."))[:500]
        return jsonify(result)
    except Exception as exc:
        app.logger.exception("Gemini command failed")
        return jsonify({
            "error": "AI command failed. Check your API key, model name, internet, and quota.",
            "details": str(exc)[:250]
        }), 502


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)
