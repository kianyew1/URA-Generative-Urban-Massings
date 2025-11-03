from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Tuple, Optional
import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt
from rasterio.features import shapes
from skimage import measure, morphology
from shapely.geometry import shape, mapping
from shapely.ops import transform as shp_transform
from rasterio.transform import from_bounds
import pyproj
import json
import base64

app = FastAPI()


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


@app.get("/api/py")
def hello():
    return {"message": "Python API is running"}


@app.post("/api/py/vectorise")
async def vectorise(request: VectoriseRequest):
    try:
        # Decode base64 image
        img_data = base64.b64decode(request.image)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        b, g, r = cv2.split(img)

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
            "R": {"storeys": dR, "ratio": fR, "distribution": R, "usetype": "Residential"},
            "C": {"storeys": dC, "ratio": fC, "distribution": C, "usetype": "Commercial"},
            "O": {"storeys": dO, "ratio": fO, "distribution": O, "usetype": "Office/Industrial"}
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
                h = float(stepdown_heights[row, col])
                usetype = str(usetype_map[row, col])
            else:
                h = 0.0
                usetype = "Unknown"

            geojson_features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "id": idx,
                    "height": h * 3,
                    "usetype": usetype,
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