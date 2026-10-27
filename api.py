import os
import re
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="COSMOSIM Space AI Provider", version="1.1.0")

# The static GitHub Pages site calls this Render service. Set ALLOWED_ORIGINS
# on Render to the exact public COSMOSIM site origin(s), comma-separated.
_origins = [origin.strip() for origin in os.getenv(
    "ALLOWED_ORIGINS", "https://anuveytq-sys.github.io"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# Use OpenRouter's free router by default so a connection test does not
# unexpectedly require paid model credits. Users can still select any
# supported model in the COSMOSIM AI panel.
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")
MAX_KEY_LENGTH = 512


class KeyRequest(BaseModel):
    api_key: str = Field(min_length=20, max_length=MAX_KEY_LENGTH)


class AskRequest(BaseModel):
    api_key: str = Field(min_length=20, max_length=MAX_KEY_LENGTH)
    question: str = Field(min_length=2, max_length=4000)
    model: Optional[str] = Field(default=None, max_length=160)


def validate_key(value: str) -> str:
    key = value.strip()
    if not key or len(key) > MAX_KEY_LENGTH or any(c.isspace() for c in key):
        raise HTTPException(status_code=400, detail="Enter a valid OpenRouter API key.")
    return key


def openrouter_error_message(response: httpx.Response) -> str:
    """Extract a useful, non-secret error message from OpenRouter."""
    try:
        data = response.json()
        error = data.get("error") if isinstance(data, dict) else None
        if isinstance(error, dict):
            message = error.get("message") or error.get("code")
            if isinstance(message, str) and message.strip():
                return message.strip()[:500]
        if isinstance(error, str) and error.strip():
            return error.strip()[:500]
    except ValueError:
        pass
    return response.text.strip()[:500] if response.text else "OpenRouter returned an error."


async def openrouter_request(key: str, payload: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("APP_PUBLIC_URL", "https://anuveytq-sys.github.io/COSMOSIM-/"),
        "X-Title": "COSMOSIM Space Lab",
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=12.0)) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenRouter took too long to respond. Please try again.")
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"Could not connect to OpenRouter: {str(error)[:300]}")

    if response.status_code in (401, 403):
        detail = openrouter_error_message(response)
        raise HTTPException(status_code=401, detail=f"OpenRouter rejected the request: {detail}")
    if response.status_code == 429:
        detail = openrouter_error_message(response)
        raise HTTPException(status_code=429, detail=f"OpenRouter rate limit or quota reached: {detail}")
    if response.status_code >= 500:
        detail = openrouter_error_message(response)
        raise HTTPException(status_code=502, detail=f"OpenRouter is temporarily unavailable: {detail}")
    if response.status_code >= 400:
        detail = openrouter_error_message(response)
        raise HTTPException(status_code=400, detail=f"OpenRouter could not process this request: {detail}")
    try:
        return response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="OpenRouter returned an unexpected response.")


@app.get("/")
async def health():
    return {"service": "COSMOSIM Space AI Provider", "status": "ok"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/openrouter/test")
async def test_openrouter(request: KeyRequest):
    key = validate_key(request.api_key)
    result = await openrouter_request(key, {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": "Reply with one short sentence confirming the OpenRouter connection works."},
            {"role": "user", "content": "Test the COSMOSIM space assistant connection."},
        ],
        "max_tokens": 80,
        "temperature": 0.2,
    })
    choices = result.get("choices") or []
    if not choices:
        raise HTTPException(status_code=502, detail="OpenRouter returned no response. Try another model.")
    return {"ok": True, "message": choices[0].get("message", {}).get("content", "Connection successful.")}


@app.post("/api/openrouter/ask")
async def ask_space(request: AskRequest):
    key = validate_key(request.api_key)
    question = request.question.strip()
    if len(question) < 2:
        raise HTTPException(status_code=400, detail="Please enter a space question.")
    model = (request.model or DEFAULT_MODEL).strip()
    # Allow normal OpenRouter model identifiers; reject whitespace/control characters.
    if not re.fullmatch(r"[A-Za-z0-9._:/-]{1,160}", model):
        raise HTTPException(status_code=400, detail="The selected model name is invalid.")
    system_prompt = (
        "You are COSMOSIM Space Assistant, a careful science guide for astronomy, "
        "space exploration, astrophysics, planets, stars, galaxies, cosmology, and the "
        "space simulations in COSMOSIM. Explain concepts clearly for a curious student. "
        "Distinguish established evidence from hypotheses and speculative models. "
        "Do not claim that COSMOSIM's visual simulations are precision scientific solvers. "
        "If asked about current discoveries or live mission telemetry, be clear that you "
        "may not have real-time information. Keep answers useful and structured."
    )
    result = await openrouter_request(key, {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "max_tokens": 900,
        "temperature": 0.5,
    })
    choices = result.get("choices") or []
    if not choices:
        raise HTTPException(status_code=502, detail="The model returned no answer. Try another model.")
    answer = choices[0].get("message", {}).get("content", "")
    if not isinstance(answer, str) or not answer.strip():
        raise HTTPException(status_code=502, detail="The model returned an empty answer. Try again.")
    return {"answer": answer.strip(), "model": result.get("model", model)}
