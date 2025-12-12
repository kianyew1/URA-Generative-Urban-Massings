# Spatial Studio Webapp

Fullstack GIS webapp built with **Next.js** (frontend) and a **FastAPI** backend for geospatial + generative pipelines. The map UI uses **deck.gl** and **maplibre** to draw layers, import GeoJSON, capture screenshots, and invoke the Python services for parcel parsing, AI generation, and vectorisation.

It is deployed with Vercel (Next.js) and Railway (FastAPI), and publicly accessible at the link in the About section.

## Project Structure

- `src/app/page.tsx` – Loads the main map ([src/app/page.tsx](src/app/page.tsx)).
- `src/components/DeckGlMap.tsx` – Core map, layer control, drawing tools, and layer operations ([src/components/DeckGlMap.tsx](src/components/DeckGlMap.tsx)).
- `src/components/ScreenshotDialog.tsx` – Multi-step flow to generate roads, parcelisation, and buildings via AI and Python API calls ([src/components/ScreenshotDialog.tsx](src/components/ScreenshotDialog.tsx)).
- `src/components/GeoJsonImporter.tsx` – Paste/import GeoJSON into a named layer ([src/components/GeoJsonImporter.tsx](src/components/GeoJsonImporter.tsx)).
- `api/` – FastAPI backend:
  - `api/main.py` – Exposes endpoints for parsing, vectorising, and full parcel generation ([api/main.py](api/main.py)).
  - `api/utils/` – Geometry, color extraction, Gemini client, and reference data helpers ([api/utils/**init**.py](api/utils/__init__.py), [api/utils/reference_data.py](api/utils/reference_data.py), [api/utils/color_extraction.py](api/utils/color_extraction.py)).
  - `api/geojsonify.py`, `api/parcel_gens.py` – Legacy/auxiliary generation and vectorisation utilities.
  - `api/API_DOCS.md`, `api/PARCEL_PIPELINE.md` – Backend docs and pipeline description.
- `public/` – Static assets (including the URA masterplan GeoJSON you place here).
- `next.config.ts` – Proxies `/api/py/*` to the Python server in development ([next.config.ts](next.config.ts)).

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- GDAL/GEOS/PROJ system libs (see `api/Dockerfile`)
- Google Gemini API key for AI generation

## Environment

Create `.env.local` (frontend) and `api/.env` (backend) based on provided examples:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000

# Backend (api/.env)
GOOGLE_GEMINI_API_KEY=your_actual_api_key
GEMINI_MODEL=gemini-2.0-flash-exp
```

## Setup & Run

```bash
# Install frontend deps
npm install

# Start frontend (port 3000)
npm run dev

# In another shell: start backend (port 8000)
cd api
source start-backend.sh
```

Open http://localhost:3000.

## Core Flows

- **Road / Parcelisation / Building generation**: Triggered via [`ScreenshotDialog`](src/components/ScreenshotDialog.tsx), which calls:
  - `POST /api/py/vectorise` – Vectorises red/blue plans to GeoJSON buildings ([api/main.py](api/main.py)).
  - `POST /api/py/parcel/parse` – Parses color-coded parcel maps.
  - `POST /api/py/parcel/vectorise` – Vectorises AI-generated parcel images.
  - `POST /api/py/parcel/generate` – Full pipeline: parse → (optional Gemini AI) → vectorise → height adjust.
- **GeoJSON import/export**: Use the Layer Control and [`GeoJsonImporter`](src/components/GeoJsonImporter.tsx); layers can be downloaded from the UI.
- **Layer management**: Layer toggling, removal, editing are handled in [`DeckGlMap`](src/components/DeckGlMap.tsx).

## Notes

- Place the URA masterplan GeoJSON into `public/` as instructed.
- Development proxy for the Python API is configured in [next.config.ts](next.config.ts).
- Backend docs and pipeline examples: [api/API_DOCS.md](api/API_DOCS.md), [api/PARCEL_PIPELINE.md](api/PARCEL_PIPELINE.md).
