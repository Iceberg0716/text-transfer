from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT_DIR = Path(__file__).resolve().parents[1]
SERVER_DIR = Path(__file__).resolve().parent
STYLES_DIR = SERVER_DIR / "styles"
CONFIG_PATH = SERVER_DIR / "config.yaml"


def load_config() -> dict[str, Any]:
  if not CONFIG_PATH.exists():
    raise RuntimeError(f"Missing config: {CONFIG_PATH}")
  data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8")) or {}
  if not isinstance(data, dict):
    raise RuntimeError("config.yaml must be a YAML mapping")
  return data


def list_styles() -> list[dict[str, str]]:
  if not STYLES_DIR.exists():
    return []
  items: list[dict[str, str]] = []
  for path in sorted(STYLES_DIR.glob("*.md"), key=lambda p: p.name):
    items.append({"id": path.stem, "name": path.stem})
  return items


def resolve_style_path(style_id: str) -> Path:
  # Prevent path traversal by only allowing known stems from scan.
  available = {item["id"] for item in list_styles()}
  if style_id not in available:
    raise HTTPException(status_code=400, detail="Unknown style_id")

  path = (STYLES_DIR / f"{style_id}.md").resolve()
  if path.parent != STYLES_DIR.resolve():
    raise HTTPException(status_code=400, detail="Invalid style_id")
  return path


async def call_chat_completions(*, base_url: str, api_key: str, model: str, messages: list[dict[str, str]], temperature: float, max_tokens: int, timeout_seconds: int) -> str:
  url = f"{base_url.rstrip('/')}/chat/completions"
  headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
  payload = {
    "model": model,
    "messages": messages,
    "temperature": temperature,
    "max_tokens": max_tokens,
  }

  timeout = httpx.Timeout(timeout_seconds)
  async with httpx.AsyncClient(timeout=timeout) as client:
    resp = await client.post(url, headers=headers, json=payload)

  if resp.status_code >= 400:
    detail = None
    try:
      detail = resp.json()
    except Exception:
      detail = resp.text
    raise HTTPException(status_code=502, detail={"upstream_status": resp.status_code, "upstream": detail})

  data = resp.json()
  try:
    return data["choices"][0]["message"]["content"]
  except Exception:
    raise HTTPException(status_code=502, detail={"upstream_status": resp.status_code, "upstream": data})


app = FastAPI()

# Serve the existing front-end files from repo root for simplicity.
app.mount("/static", StaticFiles(directory=str(ROOT_DIR), html=False), name="static")


@app.get("/")
def root() -> FileResponse:
  return FileResponse(str(ROOT_DIR / "index.html"))


@app.get("/styles.css")
def styles_css() -> FileResponse:
  return FileResponse(str(ROOT_DIR / "styles.css"))


@app.get("/script.js")
def script_js() -> FileResponse:
  return FileResponse(str(ROOT_DIR / "script.js"))


@app.get("/api/styles")
def api_styles() -> JSONResponse:
  return JSONResponse(list_styles())


@app.post("/api/rewrite")
async def api_rewrite(payload: dict[str, Any]) -> JSONResponse:
  text = (payload.get("text") or "").strip()
  style_id = (payload.get("style_id") or "").strip()
  if not text:
    raise HTTPException(status_code=400, detail="Missing text")
  if not style_id:
    raise HTTPException(status_code=400, detail="Missing style_id")

  style_path = resolve_style_path(style_id)
  style_prompt = style_path.read_text(encoding="utf-8").strip()

  cfg = load_config()
  base_url = str(cfg.get("base_url") or "").strip()
  model = str(cfg.get("model") or "").strip()
  api_key = str(cfg.get("api_key") or "").strip()
  temperature = float(cfg.get("temperature") or 0.9)
  max_tokens = int(cfg.get("max_tokens") or 1200)
  timeout_seconds = int(cfg.get("timeout_seconds") or 60)

  if not base_url or not model or not api_key or api_key == "PUT_YOUR_KEY_HERE":
    raise HTTPException(status_code=500, detail="Server config missing base_url/model/api_key")

  system_prompt = style_prompt or "将用户提供的课文改写成通俗易懂、逻辑连贯的故事，保持事实不变，分段清晰输出。"
  messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": f"请改写下面课文，并按自然段分段输出：\n\n{text}"},
  ]

  content = await call_chat_completions(
    base_url=base_url,
    api_key=api_key,
    model=model,
    messages=messages,
    temperature=temperature,
    max_tokens=max_tokens,
    timeout_seconds=timeout_seconds,
  )

  return JSONResponse({"text": content})


@app.get("/api/health")
def api_health() -> JSONResponse:
  # Helps debugging without leaking secrets.
  styles = list_styles()
  return JSONResponse(
    {
      "ok": True,
      "styles_count": len(styles),
      "config_exists": CONFIG_PATH.exists(),
    }
  )

