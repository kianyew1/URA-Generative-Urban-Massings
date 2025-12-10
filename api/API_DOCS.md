# API Documentation

## Overview

This FastAPI backend provides endpoints for processing urban planning maps and generating building layouts.

## Environment Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Add your Google Gemini API key to `.env`:

```
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the server:

```bash
uvicorn main:app --reload --port 8000
```

## Endpoints

### 1. Health Check

**GET** `/api/py`

Returns API status.

**Response:**

```json
{
  "message": "Python API is running"
}
```

---

### 2. Vectorise Urban Map (Original)

**POST** `/api/py/vectorise`

Vectorises a hand-drawn urban plan with red buildings and blue water bodies. Generates buildings with mixed use types (residential/commercial/office) and applies height falloff near water.

**Request:**

```json
{
  "image": "base64_encoded_image",
  "bbox": {
    "type": "Polygon",
    "coordinates": [[[lon, lat], ...]]
  },
  "use_mix": [0.7, 0.2, 0.1],  // residential, commercial, office ratios
  "density": [[25, 35], [4, 9], [10, 20]],  // storey ranges for R/C/O
  "sigma": 30,
  "falloff_k": 1,
  "w_threshold": 200,  // water detection threshold (blue)
  "b_threshold": 170,  // building detection threshold (red)
  "simplify_tolerance": 5.0,
  "min_area_ratio": 0.0001
}
```

**Response:** GeoJSON FeatureCollection with building polygons and properties (height, type, area).

---

### 3. Parse Color-Coded Parcel Map

**POST** `/api/py/parcel/parse`

Extracts different zone types from a color-coded urban plan image.

**Color Codes:**

- **Red** (R>100, G<100, B<100): Residential parcels
- **Yellow** (R>210, G>210, B<210): Commercial parcels
- **Blue** (B>150, R<150, G<150): Water bodies
- **Green** (G>110, R<110, B<110): Green spaces
- **Gray** (RGB≈160±85): Roads

**Request:**

```json
{
  "image": "base64_encoded_image",
  "bbox": {
    "type": "Polygon",
    "coordinates": [[[lon, lat], ...]]
  },
  "min_area_ratio": 0.0001
}
```

**Response:**

```json
{
  "type": "FeatureCollection",
  "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
  "features": [
    {
      "type": "Feature",
      "geometry": {...},
      "properties": {
        "id": "residential_0",
        "type": "residential",
        "area": 0.00012
      }
    },
    ...
  ],
  "metadata": {
    "bounds": [min_lon, min_lat, max_lon, max_lat],
    "residential_count": 15,
    "commercial_count": 3,
    "water_count": 2,
    "green_count": 5,
    "roads_count": 8
  }
}
```

---

### 4. Vectorise AI-Generated Buildings

**POST** `/api/py/parcel/vectorise`

Vectorises AI-generated building layouts (light-blue buildings on black background) to GeoJSON with height estimation based on building footprint area.

**Request:**

```json
{
  "image": "base64_encoded_image",
  "bbox": [min_lon, min_lat, max_lon, max_lat],
  "zone": "residential",  // "residential" or "commercial"
  "reference_heights": [17, 17, 7, 7, 25],  // optional reference heights
  "building_threshold": 210,
  "min_area_ratio": 0.0001,
  "simplify_tolerance_m": 2.0
}
```

**Height Assignment Logic:**

- Buildings are classified by area relative to median:
  - **Small** (area < 2/3 × median): Low height
  - **Large** (area > 1.5 × median): High height
  - **Medium**: Mid height
- Heights are derived from `reference_heights` using median split, or use defaults:
  - Residential: low=5, mid=17, high=25 storeys
  - Commercial: low=1, mid=6, high=10 storeys

**Response:** GeoJSON FeatureCollection with building polygons and properties (height in meters, levels/storeys, type, area).

---

## Architecture

```
api/
├── main.py                 # FastAPI app with endpoints
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── .env                   # Your actual environment variables (not in git)
└── utils/
    ├── __init__.py        # Package init with exports
    ├── geometry_utils.py  # Polygon processing utilities
    ├── color_extraction.py # Color-based map parsing
    └── gemini_client.py   # Google Gemini API client
```

## Utility Functions

### `geometry_utils.py`

- `mask_to_polygons()`: Convert binary mask to simplified lat/lon polygons
- `split_median()`: Split height list into low/mid/high categories
- `polygon_to_square_image_bytes_rgba()`: Convert polygon to square PNG

### `color_extraction.py`

- `extract_maps()`: Extract residential/commercial/water/green/roads from color-coded image

### `gemini_client.py`

- `get_gemini_client()`: Create Gemini API client with API key
- `safe_generate()`: Call Gemini API with retry logic and error handling

## Future Enhancements

The following endpoints from `parcel_gens.py` can be added in future iterations:

1. **POST** `/api/py/parcel/generate` - Full AI generation pipeline
2. **POST** `/api/py/parcel/generate-single` - Generate single parcel
3. **POST** `/api/py/parcel/adjust-heights` - Apply water/greenery proximity adjustment
4. **GET** `/api/py/parcel/references/search` - Find similar reference parcels

## Testing

Use the provided test script:

```bash
python test_api.py
```

Or test with curl:

```bash
curl http://localhost:8000/api/py
```

## Deployment

The API is configured for Railway deployment with the existing `Procfile` and start script.
