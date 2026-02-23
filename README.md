# meme_gen

Local single-user meme generator web app using FastAPI + HTMX-style minimal JS.

## What this project provides
- URL/file text extraction (`txt`, `md`, `html`, `json`, `csv`, `pdf`, `docx`).
- LLM text generation via `llama-cpp-python` from local `.gguf` models under `/mnt/models`.
- Multi-tone and multi-variant caption generation with queue-based processing.
- Meme rendering with Pillow (PNG + optional JPG), wrapping/auto-shrink and overflow warning.
- Background modes: solid, uploaded image, optional AI mode (ComfyUI endpoint plugin).
- Gallery with metadata sidecar JSON files next to generated images.
- JSON-based settings/presets/tones in `/data` (no SQLite).

## Assumptions and constraints documented
1. `/mnt/Pablo/memes/images` is mounted in compose even if absent. If missing, create it before running (`sudo mkdir -p /mnt/Pablo/memes/images`).
2. AI background currently has deterministic integration for ComfyUI endpoint probing. It uses `/data/comfyui_workflow.json` and returns a neutral fallback image if your workflow is not wired to image retrieval yet.
3. Non-`.gguf` model files are listed as unsupported and cannot be loaded.
4. CPU fallback is supported by setting `USE_GPU=0` in environment.

## Project layout
- `app/main.py` FastAPI app + endpoints + job queue + rendering.
- `app/templates/index.html` single-page UI (Generator / Gallery / Settings).
- `app/static/*` frontend scripts/styles.
- `app/data/defaults/*` sample tones/presets.
- `Dockerfile`, `docker-compose.yml`, `project.json` for deployment.

## Required host paths and mounts
Compose mounts:
- `/mnt/data:/mnt/data:rw`
- `/mnt/models:/mnt/models:ro`
- `/mnt/Pablo/memes/images:/mnt/outputs:rw`
- `/var/lib/meme_gen:/data:rw`

## Run
1. Ensure required directories exist:
   - `/var/lib/meme_gen`
   - `/mnt/Pablo/memes/images`
2. Build and run:
   - `docker compose build`
   - `docker compose up -d`
3. Open locally on host loopback: `http://127.0.0.1:10001`.
4. Through your reverse proxy route: `http://10.0.0.102/meme_gen`.

## API endpoints
- `POST /api/extract`
- `POST /api/generate_text`
- `POST /api/render_meme`
- `GET /api/gallery`
- `GET|POST /api/settings`
- `GET|POST /api/presets`
- `GET /docs` for OpenAPI docs

## Settings and presets storage
- `/data/settings.json`
- `/data/tones.json`
- `/data/presets.json`
- `/data/jobs.json`
- `/data/comfyui_workflow.json`
- `/data/logs/app.log` with rotation

## Minimal test plan
1. Start container and open app.
2. Paste sample URL or upload sample `.txt` and click **Fetch & Extract**.
3. Select 4 tones and set variant count 1.
4. Generate text, wait for all jobs to complete.
5. Render to `1080x1080`, solid color background.
6. Confirm files appear under `/mnt/Pablo/memes/images` and in Gallery.

## Notes on extraction support
- PDF and DOCX parsing is implemented with `pypdf` and `python-docx`.
- Very large/binary/complex formats outside listed support are intentionally rejected.
