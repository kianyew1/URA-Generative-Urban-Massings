# Full Parcel Generation Pipeline

## Overview

The complete parcel generation pipeline is now implemented with reference data integration:

1. **Parse** color-coded parcel map (residential/commercial/water/green)
2. **Generate** building layouts using Gemini AI with reference examples
3. **Vectorise** generated layouts to GeoJSON polygons
4. **Adjust** heights based on proximity to water/green features

## Endpoint: POST `/api/py/parcel/generate`

### Request Model

```json
{
  "image": "base64_encoded_color_coded_map",
  "bbox": {
    "type": "Polygon",
    "coordinates": [[[lon, lat], [lon, lat], ...]]
  },
  "town": "PUNGGOL",
  "run_ai": true,
  "model": null,
  "simplify_tolerance_m": 2.0,
  "min_area_ratio": 0.0001,
  "water_threshold_m": 100.0,
  "lpm": 4.0
}
```

### Parameters

| Parameter              | Type    | Default   | Description                                                                        |
| ---------------------- | ------- | --------- | ---------------------------------------------------------------------------------- |
| `image`                | string  | required  | Base64-encoded color-coded parcel map                                              |
| `bbox`                 | GeoJSON | required  | Bounding box as GeoJSON Polygon geometry                                           |
| `town`                 | string  | "PUNGGOL" | Town/region name (for reference data context)                                      |
| `run_ai`               | boolean | false     | If true, invoke Gemini for building generation; if false, return parcels as shells |
| `model`                | string  | null      | Override Gemini model name (uses env `GEMINI_MODEL` if not provided)               |
| `simplify_tolerance_m` | float   | 2.0       | Polygon simplification tolerance in meters                                         |
| `min_area_ratio`       | float   | 0.0001    | Minimum area ratio for keeping polygons                                            |
| `water_threshold_m`    | float   | 100.0     | Distance threshold for water proximity adjustment                                  |
| `lpm`                  | float   | 4.0       | Levels per meter when adjusting heights near water                                 |

### Response

```json
{
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": {
      "name": "EPSG:4326"
    }
  },
  "features": [
    {
      "type": "Feature",
      "geometry": { ... },
      "properties": {
        "id": 0,
        "levels": 17,
        "height": 51,
        "type": "residential",
        "area": 0.00012
      }
    }
  ],
  "metadata": {
    "residential_parcels": 15,
    "commercial_parcels": 3,
    "generated": true
  }
}
```

## Reference Data Integration

### ReferenceDataManager

Automatically loaded on first use. Indexes:

- **Location**: `api/geojsons/` and `api/pngs/`
- **Residential**: `PUNGGOL.geojson` + `PUNGGOL_hdbs_f/` PNGs
- **Commercial**: `commercial.geojson` + `Commercial/` PNGs

### Reference Selection Algorithm

For each parcel:

1. Calculate parcel area from polygon
2. Convert to approximate dimension in meters: `dim ≈ √(area_m²)`
3. Find PNG references sorted by dimension
4. Select ~3 closest references by dimension
5. Include in Gemini prompt with their dimensions and building levels

### PNG Metadata

Extracts from PNG metadata chunks:

- `dimensions_m`: Square bounds in meters
- `levels`: Building heights as list of storeys
- `coordinates`: GeoJSON bounds

## Workflow Examples

### Example 1: Generate buildings with AI

```bash
curl -X POST http://localhost:8000/api/py/parcel/generate \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANS...",
    "bbox": {"type": "Polygon", "coordinates": [[...]]},
    "run_ai": true,
    "town": "PUNGGOL"
  }'
```

The endpoint will:

1. Parse the color-coded map into residential/commercial polygons
2. For each parcel, find similar-sized references from `pngs/` folder
3. Call Gemini with parcel image + references → generates building layout
4. Vectorise the generated layout to building footprints
5. Reduce heights for features near water/green (≤100m)
6. Return GeoJSON with all features

### Example 2: Parse only (no AI)

```bash
curl -X POST http://localhost:8000/api/py/parcel/generate \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANS...",
    "bbox": {"type": "Polygon", "coordinates": [[...]]},
    "run_ai": false
  }'
```

Returns empty parcel shells (height=0) without calling Gemini.

## Implementation Details

### Files Modified

1. **`api/main.py`**:

   - Added `ParcelGenerateRequest` model
   - Added `_generate_building_image_with_gemini()` with reference support
   - Added `_vectorise_generated_image()` helper
   - Added `_adjust_heights_near_water_green()` helper
   - Added `/api/py/parcel/generate` endpoint
   - Added `get_reference_manager()` singleton loader

2. **`api/utils/reference_data.py`** (new):

   - `ReferenceDataManager` class
   - Indexes PNG metadata by zone
   - Provides `get_residential_references()` and `get_commercial_references()`
   - Dimension-based similarity search

3. **`api/utils/__init__.py`**:
   - Exported `ReferenceDataManager`

### Environment Requirements

```bash
# In .env or environment
GOOGLE_GEMINI_API_KEY=your_actual_api_key
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Assumptions

- PNGs are stored with naming pattern: `{id}_combined.png`, `{id}_parcel.png`, `{id}_buildings.png`
- PNG metadata is embedded in PNG info chunks (handled by Pillow)
- geojson features have `@id` property or are indexed by position
- All coordinates in EPSG:4326 (lat/lon)

## Future Enhancements

1. **Batch Processing**: Process multiple parcels in parallel with background tasks
2. **Caching**: Cache reference lookups by area range
3. **Quality Control**: Add shape similarity check (IoU) to retry failed generations
4. **Database**: Store reference metadata in PostgreSQL for faster lookup
5. **WebSocket**: Stream progress updates as parcels are generated
