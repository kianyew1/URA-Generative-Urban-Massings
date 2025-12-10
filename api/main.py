from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import io
import base64
import pyproj
import os
from dotenv import load_dotenv
from scipy.ndimage import distance_transform_edt
from rasterio.features import shapes
from skimage import measure, morphology
from shapely.geometry import shape, mapping
from shapely.ops import transform as shp_transform
from rasterio.transform import from_bounds
from PIL import Image
import cv2

# Load environment variables
load_dotenv()

# Import utility functions
from utils.geometry_utils import mask_to_polygons, split_median, polygon_to_square_image_bytes_rgba
from utils.color_extraction import extract_maps
from utils.gemini_client import get_gemini_client, safe_generate
from utils.reference_data import ReferenceDataManager

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ura-generative-urban-massings.vercel.app",
        "*"  # For development - remove in production and specify exact origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize reference data manager
_REF_MANAGER: Optional[ReferenceDataManager] = None


def get_reference_manager():
    """Lazy-load reference data manager."""
    global _REF_MANAGER
    if _REF_MANAGER is None:
        api_dir = os.path.dirname(os.path.abspath(__file__))
        geojson_dir = os.path.join(api_dir, "geojsons")
        png_dir = os.path.join(api_dir, "pngs")
        _REF_MANAGER = ReferenceDataManager(geojson_dir, png_dir)
    return _REF_MANAGER

class VectoriseRequest(BaseModel):
    image: str  # base64 encoded
    bbox: dict
    use_mix: Optional[List[float]] = [0.7, 0.2, 0.1]
    density: Optional[List[Tuple[int, int]]] = [(25, 35), (4, 9), (10, 20)]
    sigma: Optional[int] = 30
    falloff_k: Optional[int] = 1
    w_threshold: Optional[int] = 200
    b_threshold: Optional[int] = 170
    simplify_tolerance: Optional[float] = 5.0
    min_area_ratio: Optional[float] = 0.0001


class ParcelParseRequest(BaseModel):
    image: str  # base64 encoded
    bbox: dict  # GeoJSON geometry with coordinates
    min_area_ratio: Optional[float] = 0.0001


class ParcelVectoriseRequest(BaseModel):
    image: str  # base64 encoded (light-blue buildings on black background)
    bbox: List[float]  # [min_lon, min_lat, max_lon, max_lat]
    zone: Optional[str] = "residential"  # "residential" or "commercial"
    reference_heights: Optional[List[int]] = None
    building_threshold: Optional[int] = 210
    min_area_ratio: Optional[float] = 0.0001
    simplify_tolerance_m: Optional[float] = 2.0


class ParcelGenerateRequest(BaseModel):
    image: str  # base64 encoded color-coded parcel map
    bbox: dict  # GeoJSON geometry with coordinates
    town: Optional[str] = "PUNGGOL"
    run_ai: Optional[bool] = False  # set True to invoke Gemini generation
    model: Optional[str] = None  # override model name if needed
    simplify_tolerance_m: Optional[float] = 2.0
    min_area_ratio: Optional[float] = 0.0001
    water_threshold_m: Optional[float] = 100.0
    lpm: Optional[float] = 4.0  # levels per meter when near water/green


def _vectorise_generated_image(
    image_bytes: bytes,
    bbox: List[float],
    zone: str,
    simplify_tolerance_m: float,
    min_area_ratio: float,
    building_threshold: int = 210,
):
    """Vectorise a generated parcel image (light-blue on black)."""
    img_array = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    b, g, r = cv2.split(img_array)

    building_map = np.where(
        (r < building_threshold) & (g < building_threshold) & (b > building_threshold),
        1,
        0,
    )

    min_lon, min_lat, max_lon, max_lat = bbox
    height, width = building_map.shape
    transform = from_bounds(min_lon, min_lat, max_lon, max_lat, width, height)

    mask = building_map > 0
    min_area_pixels = int(min_area_ratio * height * width)
    mask = morphology.remove_small_objects(mask.astype(bool), min_size=min_area_pixels)

    labels = measure.label(mask)
    polygons = []
    for region in measure.regionprops(labels):
        coords = region.coords
        single_mask = np.zeros_like(mask, dtype=np.uint8)
        single_mask[tuple(coords.T)] = 1

        for geom, val in shapes(single_mask, mask=single_mask, transform=transform):
            if val == 1:
                poly = shape(geom)
                if poly.area > 0:
                    polygons.append(poly)

    centroid_lon = (min_lon + max_lon) / 2
    centroid_lat = (min_lat + max_lat) / 2
    utm_zone = int((centroid_lon + 180) / 6) + 1
    utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"
    to_utm = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True).transform
    to_wgs = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform

    simplified_polygons = []
    all_areas = []
    for poly in polygons:
        if not poly.is_valid or poly.area <= 0:
            continue
        poly_m = shp_transform(to_utm, poly)
        poly_simplified_m = poly_m.simplify(simplify_tolerance_m, preserve_topology=True)
        poly_simplified = shp_transform(to_wgs, poly_simplified_m)
        simplified_polygons.append(poly_simplified)
        all_areas.append(poly_simplified.area)

    median_area = np.median(all_areas) if len(all_areas) > 0 else 0
    # Default height bands if no reference heights provided
    if zone.lower() == "residential":
        l_h, m_h, h_h = 5, 17, 25
    else:
        l_h, m_h, h_h = 1, 6, 10

    features = []
    for idx, poly in enumerate(simplified_polygons):
        if poly.area < 2 / 3 * median_area:
            h = l_h
        elif poly.area > 1.5 * median_area:
            h = h_h
        else:
            h = m_h

        features.append(
            {
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": idx,
                    "levels": h,
                    "height": h * 3,
                    "type": zone.lower(),
                    "area": poly.area,
                },
            }
        )

    return features


def _adjust_heights_near_water_green(
    features: List[Dict[str, Any]],
    water_map: np.ndarray,
    green_map: np.ndarray,
    bounds: Tuple[float, float, float, float],
    width: int,
    height: int,
    threshold_m: float,
    lpm: float,
):
    """Clamp heights near water/green using distance transform."""
    c_map = (water_map > 0).astype(np.uint8) + (green_map > 0).astype(np.uint8)
    if c_map.max() == 0:
        return features

    min_lon, min_lat, max_lon, max_lat = bounds
    centroid_lon = (min_lon + max_lon) / 2
    utm_zone = int((centroid_lon + 180) / 6) + 1
    utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"
    transformer = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True)

    min_x, min_y = transformer.transform(min_lon, min_lat)
    max_x, max_y = transformer.transform(max_lon, max_lat)

    distance_map = distance_transform_edt(c_map == 0)
    pixel_size_x = (max_x - min_x) / width if width > 0 else 0
    pixel_size_y = (max_y - min_y) / height if height > 0 else 0
    pixel_size = (pixel_size_x + pixel_size_y) / 2 if (pixel_size_x > 0 and pixel_size_y > 0) else 0
    if pixel_size == 0:
        return features

    def meters_to_pixel(x_m, y_m):
        px = (x_m - min_x) / (max_x - min_x) * (width - 1)
        py = (max_y - y_m) / (max_y - min_y) * (height - 1)
        return int(np.clip(px, 0, width - 1)), int(np.clip(py, 0, height - 1))

    for feature in features:
        geom = shape(feature["geometry"])
        cx, cy = geom.centroid.x, geom.centroid.y
        x_m, y_m = transformer.transform(cx, cy)
        px, py = meters_to_pixel(x_m, y_m)
        dist_m = distance_map[py, px] * pixel_size

        if dist_m <= threshold_m:
            levels_adj = int(dist_m / lpm) + 1
            current_levels = int(
                feature["properties"].get(
                    "levels", feature["properties"].get("height", 0) / 3
                )
            )
            new_levels = min(current_levels, levels_adj)
            feature["properties"]["levels"] = new_levels
            feature["properties"]["height"] = new_levels * 3

    return features


def _generate_building_image_with_gemini(parcel_bytes: bytes, dimensions_m: float, zone: str, model: Optional[str], reference_examples: Optional[List[Dict]] = None):
    """Call Gemini to generate building footprint image for a parcel with reference examples."""
    client = get_gemini_client()
    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

    prompt = (
        f"The first attached image shows a parcel outline for an urban development in Singapore. "
        f"The parcel spans roughly {dimensions_m:.2f} meters on each side. "
        f"Generate a 2D building footprint layout for {zone.lower()} use. "
        f"Use a black background and light-blue (#83C7EC) footprints. "
        f"Keep footprints inside the parcel outline and respect realistic scales. "
    )
    
    if reference_examples:
        prompt += (
            f"Use the following reference examples of populated {zone.lower()} parcels as style guides, "
            f"paying attention to how building typologies and density scale with parcel size. "
        )

    parts = [
        {"text": "PARCEL_IMAGE:"},
        {
            "inline_data": {
                "mime_type": "image/png",
                "data": parcel_bytes,
            }
        },
    ]

    # Add reference examples if available
    if reference_examples:
        parts.append({"text": "REFERENCE_EXAMPLES:"})
        ref_mgr = get_reference_manager()
        for i, ref_data in enumerate(reference_examples[:3]):  # Max 3 references
            png_bytes = ref_mgr.read_png_bytes(ref_data)
            if png_bytes:
                parts.append(
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": png_bytes,
                        }
                    }
                )
                dims = ref_data.get("dimensions_m", 0)
                parts.append({"text": f"Reference {i+1}: {dims:.2f} metres"})

    parts.append({"text": prompt})

    contents = [{"parts": parts}]

    result = safe_generate(client, model_name, contents)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=f"Gemini generation failed: {result.get('error')}")

    response = result["response"]
    try:
        return response.candidates[0].content.parts[0].inline_data.data
    except Exception as e:  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail=f"Gemini response parsing failed: {str(e)}")


@app.get("/api/py")
def hello():
    return {"message": "Python API is running"}


@app.post("/api/py/vectorise")
async def vectorise(request: VectoriseRequest):
    try:
        # Decode base64 image using Pillow
        img_data = base64.b64decode(request.image)
        img = Image.open(io.BytesIO(img_data)).convert('RGB')
        img_array = np.array(img)
        
        r = img_array[:, :, 0]
        g = img_array[:, :, 1]
        b = img_array[:, :, 2]

        # Create building and terrain maps
        building_map = np.where(
            (r > request.b_threshold) & 
            (g < request.b_threshold) & 
            (b < request.b_threshold), 
            1, 0
        )
        terrain_map = np.where(
            (b > request.w_threshold) & 
            (g < request.w_threshold) & 
            (r < request.w_threshold), 
            1, 0
        )

        # Load bounding box
        bbox_geom = shape(request.bbox)
        min_lon, min_lat, max_lon, max_lat = bbox_geom.bounds

        # Get raster dimensions and define transform
        height, width = building_map.shape
        transform = from_bounds(
            min_lon, min_lat,
            max_lon, max_lat,
            width, height
        )

        # Calculate use mix parameters
        dR, dC, dO = request.density
        fR, fC, fO = request.use_mix

        adR = (dR[0] + dR[1]) / 2
        adC = (dC[0] + dC[1]) / 2
        adO = (dO[0] + dO[1]) / 2

        R = (fR / adR)
        C = (fC / adC)
        O = (fO / adO)

        total = R + C + O
        R /= total
        C /= total
        O /= total

        use_mix_params = {
            "R": {"storeys": dR, "ratio": fR, "distribution": R, "usetype": "residential"},
            "C": {"storeys": dC, "ratio": fC, "distribution": C, "usetype": "commercial"},
            "O": {"storeys": dO, "ratio": fO, "distribution": O, "usetype": "office"}
        }

        ratio_list = sorted(
            [use_mix_params["R"], use_mix_params["C"], use_mix_params["O"]], 
            key=lambda x: x["ratio"], 
            reverse=True
        )

        # Generate heights and use types
        heights = np.random.randint(
            ratio_list[0]["storeys"][0], 
            ratio_list[0]["storeys"][1], 
            size=(height, width)
        )
        usetype_map = np.full(heights.shape, ratio_list[0]["usetype"], dtype='<U20')

        mask_1 = np.random.rand(height, width) < ratio_list[1]["distribution"]
        heights[mask_1] = np.random.randint(
            ratio_list[1]["storeys"][0], 
            ratio_list[1]["storeys"][1], 
            size=mask_1.sum()
        )
        usetype_map[mask_1] = ratio_list[1]["usetype"]

        mask_2 = np.random.rand(height, width) < ratio_list[2]["distribution"]
        heights[mask_2] = np.random.randint(
            ratio_list[2]["storeys"][0], 
            ratio_list[2]["storeys"][1], 
            size=mask_2.sum()
        )
        usetype_map[mask_2] = ratio_list[2]["usetype"]

        # Apply terrain falloff
        distance = distance_transform_edt(~terrain_map)
        weights = np.exp(-((request.falloff_k * distance) ** 2) / (2 * request.sigma ** 2))
        stepdown_heights = (heights * (1 - weights)).astype(int)

        # Remove small objects
        mask = building_map > 0
        min_area_pixels = int(request.min_area_ratio * height * width)
        mask = morphology.remove_small_objects(mask.astype(bool), min_size=min_area_pixels)

        # Label connected components
        labels = measure.label(mask)

        # Polygonize
        polygons = []
        for region in measure.regionprops(labels):
            coords = region.coords
            single_mask = np.zeros_like(mask, dtype=np.uint8)
            single_mask[tuple(coords.T)] = 1

            for geom, val in shapes(single_mask, mask=single_mask, transform=transform):
                if val == 1:
                    poly = shape(geom)
                    if poly.area > 0:
                        polygons.append(poly)

        # Simplify using UTM
        centroid_lon = (min_lon + max_lon) / 2
        centroid_lat = (min_lat + max_lat) / 2
        utm_zone = int((centroid_lon + 180) / 6) + 1
        utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"

        to_utm = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True).transform
        to_wgs = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform

        simplified_polygons = []
        for poly in polygons:
            if not poly.is_valid or poly.area <= 0:
                continue
            poly_m = shp_transform(to_utm, poly)
            poly_simplified_m = poly_m.simplify(request.simplify_tolerance, preserve_topology=True)
            poly_simplified = shp_transform(to_wgs, poly_simplified_m)
            simplified_polygons.append(poly_simplified)

        # Create GeoJSON features
        geojson_features = []
        for idx, poly in enumerate(simplified_polygons):
            lon, lat = poly.centroid.x, poly.centroid.y
            col, row = (~transform) * (lon, lat)
            col, row = int(col), int(row)

            if (0 <= row < stepdown_heights.shape[0]) and (0 <= col < stepdown_heights.shape[1]):
                levels = int(stepdown_heights[row, col])
                usetype = str(usetype_map[row, col])
            else:
                levels = 0
                usetype = "residential"  # Default to residential instead of "Unknown"

            geojson_features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": idx,
                    "levels": levels,
                    "height": levels * 3,
                    "type": usetype,
                    "area": poly.area
                }
            })

        # --------------------------
        # Apply water/green proximity height adjustment (siteAdjust-inspired)
        # --------------------------
        green_threshold = 110
        green_map = np.where(
            (b < green_threshold) & (g > green_threshold) & (r < green_threshold),
            1,
            0,
        )
        water_map = (terrain_map > 0).astype(np.uint8)
        c_map = water_map + green_map

        if c_map.max() > 0:
            # Distance transform on non-water/green areas
            distance_map = distance_transform_edt(c_map == 0)

            # Approximate pixel size in meters using UTM projection
            transformer_m = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True)
            min_x, min_y = transformer_m.transform(min_lon, min_lat)
            max_x, max_y = transformer_m.transform(max_lon, max_lat)

            pixel_size_x = (max_x - min_x) / width if width > 0 else 0
            pixel_size_y = (max_y - min_y) / height if height > 0 else 0
            pixel_size = (pixel_size_x + pixel_size_y) / 2 if (pixel_size_x > 0 and pixel_size_y > 0) else 0

            if pixel_size > 0:
                threshold_m = 100.0  # max distance to water/green to adjust
                lpm = 4.0  # levels per meter scaling factor

                def meters_to_pixel(x_m, y_m):
                    px = (x_m - min_x) / (max_x - min_x) * (width - 1)
                    py = (max_y - y_m) / (max_y - min_y) * (height - 1)
                    return int(np.clip(px, 0, width - 1)), int(np.clip(py, 0, height - 1))

                for feature in geojson_features:
                    geom = shape(feature["geometry"])
                    cx, cy = geom.centroid.x, geom.centroid.y
                    x_m, y_m = transformer_m.transform(cx, cy)
                    px, py = meters_to_pixel(x_m, y_m)
                    dist_m = distance_map[py, px] * pixel_size

                    # Reduce heights near water/green
                    if dist_m <= threshold_m:
                        levels_adj = int(dist_m / lpm) + 1
                        current_levels = int(feature["properties"].get("levels", feature["properties"].get("height", 0) / 3))
                        new_levels = min(current_levels, levels_adj)
                        feature["properties"]["levels"] = new_levels
                        feature["properties"]["height"] = new_levels * 3

        return {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
            "features": geojson_features
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/py/parcel/parse")
async def parse_parcels(request: ParcelParseRequest):
    """
    Parse a color-coded urban plan image to extract different parcel types.
    
    Color codes:
    - Red: Residential parcels
    - Yellow: Commercial parcels
    - Blue: Water bodies
    - Green: Green spaces
    - Gray: Roads
    
    Returns GeoJSON with separated parcel types.
    """
    try:
        # Decode base64 image
        img_data = base64.b64decode(request.image)
        img = Image.open(io.BytesIO(img_data)).convert('RGB')
        img_array = np.array(img)
        
        # Extract different map layers
        residential_map, commercial_map, water_map, green_map, roads_map = extract_maps(
            img_array, 
            min_area_ratio=request.min_area_ratio
        )
        
        # Get bounding box
        bbox_geom = shape(request.bbox)
        min_lon, min_lat, max_lon, max_lat = bbox_geom.bounds
        height, width = img_array.shape[:2]
        
        # Convert maps to polygons
        residential_polygons = mask_to_polygons(
            residential_map, width, height, 
            (min_lat, max_lat, min_lon, max_lon)
        )
        
        commercial_polygons = mask_to_polygons(
            commercial_map, width, height,
            (min_lat, max_lat, min_lon, max_lon)
        )
        
        water_polygons = mask_to_polygons(
            water_map, width, height,
            (min_lat, max_lat, min_lon, max_lon)
        )
        
        green_polygons = mask_to_polygons(
            green_map, width, height,
            (min_lat, max_lat, min_lon, max_lon)
        )
        
        roads_polygons = mask_to_polygons(
            roads_map, width, height,
            (min_lat, max_lat, min_lon, max_lon)
        )
        
        # Create GeoJSON features
        features = []
        
        for idx, poly in enumerate(residential_polygons):
            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": f"residential_{idx}",
                    "type": "residential",
                    "area": poly.area
                }
            })
        
        for idx, poly in enumerate(commercial_polygons):
            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": f"commercial_{idx}",
                    "type": "commercial",
                    "area": poly.area
                }
            })
        
        for idx, poly in enumerate(water_polygons):
            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": f"water_{idx}",
                    "type": "water",
                    "area": poly.area
                }
            })
        
        for idx, poly in enumerate(green_polygons):
            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": f"green_{idx}",
                    "type": "green",
                    "area": poly.area
                }
            })
        
        for idx, poly in enumerate(roads_polygons):
            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": f"road_{idx}",
                    "type": "road",
                    "area": poly.area
                }
            })
        
        return {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
            "features": features,
            "metadata": {
                "bounds": [min_lon, min_lat, max_lon, max_lat],
                "residential_count": len(residential_polygons),
                "commercial_count": len(commercial_polygons),
                "water_count": len(water_polygons),
                "green_count": len(green_polygons),
                "roads_count": len(roads_polygons)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/py/parcel/vectorise")
async def vectorise_parcel(request: ParcelVectoriseRequest):
    """
    Vectorise AI-generated building layout to GeoJSON.
    Expects light-blue buildings on black background.
    
    Returns GeoJSON with building footprints and heights.
    """
    try:
        # Decode base64 image
        img_data = base64.b64decode(request.image)
        img_array = cv2.imdecode(np.frombuffer(img_data, np.uint8), cv2.IMREAD_COLOR)
        b, g, r = cv2.split(img_array)
        
        # Detect light-blue buildings (from AI generation)
        building_map = np.where(
            (r < request.building_threshold) & 
            (g < request.building_threshold) & 
            (b > request.building_threshold), 
            1, 0
        )
        
        # Get bounding box
        min_lon, min_lat, max_lon, max_lat = request.bbox
        
        # Get raster dimensions and define transform
        height, width = building_map.shape
        transform = from_bounds(
            min_lon, min_lat,
            max_lon, max_lat,
            width, height
        )
        
        # Remove small objects
        mask = building_map > 0
        min_area_pixels = int(request.min_area_ratio * height * width)
        mask = morphology.remove_small_objects(mask.astype(bool), min_size=min_area_pixels)
        
        # Label connected components
        labels = measure.label(mask)
        
        # Polygonize
        polygons = []
        for region in measure.regionprops(labels):
            coords = region.coords
            single_mask = np.zeros_like(mask, dtype=np.uint8)
            single_mask[tuple(coords.T)] = 1
            
            for geom, val in shapes(single_mask, mask=single_mask, transform=transform):
                if val == 1:
                    poly = shape(geom)
                    if poly.area > 0:
                        polygons.append(poly)
        
        # Simplify using UTM
        centroid_lon = (min_lon + max_lon) / 2
        centroid_lat = (min_lat + max_lat) / 2
        utm_zone = int((centroid_lon + 180) / 6) + 1
        utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"
        
        to_utm = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True).transform
        to_wgs = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform
        
        simplified_polygons = []
        all_areas = []
        for poly in polygons:
            if not poly.is_valid or poly.area <= 0:
                continue
            poly_m = shp_transform(to_utm, poly)
            poly_simplified_m = poly_m.simplify(request.simplify_tolerance_m, preserve_topology=True)
            poly_simplified = shp_transform(to_wgs, poly_simplified_m)
            simplified_polygons.append(poly_simplified)
            all_areas.append(poly_simplified.area)
        
        # Assign heights based on area (using median split)
        if request.reference_heights and len(request.reference_heights) > 0:
            split_heights = split_median(request.reference_heights)
        else:
            # Default heights based on zone
            if request.zone.lower() == 'residential':
                split_heights = {'low': [5], 'mid': [17], 'high': [25]}
            else:  # commercial
                split_heights = {'low': [1], 'mid': [6], 'high': [10]}
        
        # Calculate median area for classification
        median_area = np.median(all_areas) if len(all_areas) > 0 else 0
        
        # Get height values
        l_h = int(np.median(split_heights['low'])) if split_heights['low'] else 5
        m_h = int(np.median(split_heights['mid'])) if split_heights['mid'] else 17
        h_h = int(np.median(split_heights['high'])) if split_heights['high'] else 25
        
        # Create GeoJSON features
        geojson_features = []
        for idx, poly in enumerate(simplified_polygons):
            # Assign height based on area
            if poly.area < 2/3 * median_area:
                h = l_h
            elif poly.area > 1.5 * median_area:
                h = h_h
            else:
                h = m_h
            
            geojson_features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": idx,
                    "height": h * 3,  # Convert storeys to meters
                    "levels": h,
                    "type": request.zone.lower(),
                    "area": poly.area
                }
            })
        
        return {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
            "features": geojson_features
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/py/parcel/generate")
async def generate_parcels(request: ParcelGenerateRequest):
    """
    Full parcel pipeline: parse color-coded map -> (optional) Gemini generation -> vectorise -> height adjust.

    - Color codes are the same as /api/py/parcel/parse.
    - When run_ai=True, Gemini generates building footprints per parcel; otherwise parcels are returned as shells.
    """
    try:
        # Decode base64 map
        img_data = base64.b64decode(request.image)
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        img_array = np.array(img)

        # Extract masks
        residential_map, commercial_map, water_map, green_map, _ = extract_maps(
            img_array, min_area_ratio=request.min_area_ratio
        )

        # Bounds
        bbox_geom = shape(request.bbox)
        min_lon, min_lat, max_lon, max_lat = bbox_geom.bounds
        height, width = img_array.shape[:2]

        # Polygons
        residential_polys = mask_to_polygons(
            residential_map, width, height, (min_lat, max_lat, min_lon, max_lon)
        )
        commercial_polys = mask_to_polygons(
            commercial_map, width, height, (min_lat, max_lat, min_lon, max_lon)
        )

        features: List[Dict[str, Any]] = []

        def process_parcel(poly, zone: str):
            parcel_bytes, parcel_bounds, size = polygon_to_square_image_bytes_rgba(poly)
            dimensions_m = float(size[0])  # approx side in meters from rasterization

            if request.run_ai:
                # Get reference examples for this parcel
                ref_mgr = get_reference_manager()
                area_m2 = poly.area * 111320 * 111320  # rough approximation
                if zone.lower() == "residential":
                    references = ref_mgr.get_residential_references(area_m2)
                else:
                    references = ref_mgr.get_commercial_references(area_m2)
                
                output_bytes = _generate_building_image_with_gemini(
                    parcel_bytes, dimensions_m, zone, request.model, references
                )
                feats = _vectorise_generated_image(
                    output_bytes,
                    parcel_bounds,
                    zone,
                    request.simplify_tolerance_m,
                    request.min_area_ratio,
                )
                features.extend(feats)
            else:
                features.append(
                    {
                        "type": "Feature",
                        "geometry": mapping(poly),
                        "properties": {
                            "id": f"{zone.lower()}_parcel_{len(features)}",
                            "levels": 0,
                            "height": 0,
                            "type": zone.lower(),
                            "area": poly.area,
                        },
                    }
                )

        for poly in residential_polys:
            process_parcel(poly, "residential")
        for poly in commercial_polys:
            process_parcel(poly, "commercial")

        if len(features) == 0:
            raise HTTPException(status_code=400, detail="No parcels detected to process")

        # Height adjustment near water/green
        features = _adjust_heights_near_water_green(
            features,
            water_map,
            green_map,
            (min_lon, min_lat, max_lon, max_lat),
            width,
            height,
            request.water_threshold_m,
            request.lpm,
        )

        return {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
            "features": features,
            "metadata": {
                "residential_parcels": len(residential_polys),
                "commercial_parcels": len(commercial_polys),
                "generated": request.run_ai,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))