import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt
import rasterio
from rasterio.features import shapes
from skimage import measure, morphology
from shapely.geometry import shape, mapping
from shapely import wkt
# import geopandas as gpd
from shapely.ops import transform as shp_transform # from shapely.ops import transform as tf
from rasterio.transform import from_origin, from_bounds
import pyproj
import json
import base64
from io import BytesIO
from PIL import Image

# !!!--------------------------
# Projection system for simplification is based on EPSG:32648 (UTM zone 48N). Not EPSG:3857.
# output_geojson is projected back to EPSG:4326 (WGS84) at the end.
# !!!--------------------------


# --------------------------
# User parameters
# --------------------------
# use_mix = [0.7, 0.2, 0.1]
# density = ([(25, 35), (4, 9), (10, 20)])
# sigma = 30
# falloff_k = 1
# input_img = "input.png"
# bbox_geojson = "bounding_box.json"    # top-left, top-right, bottom-right, bottom-left
# water_threshold = 200                 # tweak as needed, defaults: building = 170, water = 200
# building_threshold = 170              # threshold for red detection
# simplify_tolerance_m = 5.0            # simplification tolerance (meters)
# min_area_ratio = 0.0001               # proportion of total image pixels for noise removal
# output_geojson = "output.geojson"     # final polygon output


def Geojsonify(params):
    body = json.loads(params.body)

    use_mix = body.get("use_mix", [0.7, 0.2, 0.1])
    density = body.get("density", ([(25, 35), (4, 9), (10, 20)]))
    sigma = body.get("sigma", 30)
    falloff_k = body.get("falloff_k", 1)
    bbox_geojson = body.get("bbox")                                     #   COMPULSORY  
    img_data = base64.b64decode(body['image'])                          #   COMPULSORY
    water_threshold = body.get("w_threshold", 200)
    building_threshold = body.get("b_threshold", 170)
    simplify_tolerance_m = body.get("simplify_tolerance", 5.0)
    min_area_ratio = body.get("min_area_ratio", 0.0001)

    output_geojson = "output.geojson"


    # 2. Convert bytes to numpy array
    nparr = np.frombuffer(img_data, np.uint8)

    # 3. Decode image from numpy array
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    b, g, r = cv2.split(img)

    building_map = np.where((r > building_threshold) & (g < building_threshold) & (b < building_threshold), 1, 0)
    terrain_map = np.where((b > water_threshold) & (g < water_threshold) & (r < water_threshold), 1, 0)

    # --------------------------
    # 2. Load bounding box GeoJSON (EPSG:4326)
    # --------------------------
    with open(bbox_geojson) as f:
        bbox_data = json.load(f)

    bbox_geom = shape(bbox_data)
    min_lon, min_lat, max_lon, max_lat = bbox_geom.bounds


    # --------------------------
    # 3. Get raster dimensions and define transform
    # --------------------------
    height, width = building_map.shape
    print(f"Raster size: {width} × {height}")

    # from rasterio.transform import from_bounds
    transform = from_bounds(
        min_lon, min_lat,  # west, south
        max_lon, max_lat,  # east, north
        width, height
    )

    # --------------------------
    # 3.5. Finding UseMix parameters
    # --------------------------
    dR, dC, dO = density
    fR, fC, fO = use_mix

    adR = (dR[0] + dR[1]) /2
    adC = (dC[0] + dC[1]) /2
    adO = (dO[0] + dO[1]) /2

    R = (fR / adR)
    C = (fC / adC)
    O = (fO / adO)

    total = R + C + O
    R /= total
    C /= total
    O /= total

    use_mix_params = {
        "R": {
            "storeys": dR,
            "ratio": fR,
            "distribution": R,
            "usetype": "Residential"
        },
        "C": {
            "storeys": dC,
            "ratio": fC,
            "distribution": C,
            "usetype": "Commercial"
        },
        "O": {
            "storeys": dO,
            "ratio": fO,
            "distribution": O,
            "usetype": "Office/Industrial"
        }
    }

    ratio_list = [use_mix_params["R"], use_mix_params["C"], use_mix_params["O"]]
    ratio_list = sorted(ratio_list, key=lambda x: x["ratio"], reverse=True)

    heights = np.random.randint(ratio_list[0]["storeys"][0], ratio_list[0]["storeys"][1], size=(height, width))
    usetype_map = np.full(heights.shape, ratio_list[0]["usetype"], dtype='<U1')

    mask_1 = np.random.rand(*(height, width)) < ratio_list[1]["distribution"]  # 10% chance
    heights[mask_1] = np.random.randint(ratio_list[1]["storeys"][0], ratio_list[1]["storeys"][1], size=mask_1.sum())
    usetype_map[mask_1] = ratio_list[1]["usetype"]

    mask_2 = np.random.rand(*(height, width)) < ratio_list[2]["distribution"]  # 2% chance
    heights[mask_2] = np.random.randint(ratio_list[2]["storeys"][0], ratio_list[2]["storeys"][1], size=mask_2.sum())
    usetype_map[mask_2] = ratio_list[2]["usetype"]

    mask = (terrain_map == 1)
    distance = distance_transform_edt(~terrain_map)
    weights = np.exp(-((falloff_k * distance) ** 2) / (2 * sigma ** 2))
    stepdown_heights = heights * (1 - weights)
    stepdown_heights = stepdown_heights.astype(int)

    # --------------------------
    # 4. Threshold and remove noise (adaptive min area)
    # --------------------------
    mask = building_map > 0
    min_area_pixels = int(min_area_ratio * height * width)
    print(f"Using min_area_pixels = {min_area_pixels}")
    mask = morphology.remove_small_objects(mask.astype(bool), min_size=min_area_pixels)

    # Label connected components
    labels = measure.label(mask)

    # --------------------------
    # 5. Polygonize connected components
    # --------------------------
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


    # --------------------------
    # 6. Simplify polygons using UTM (meters)
    # --------------------------
    # Determine approximate UTM zone from bounding box centroid
    centroid_lon = (min_lon + max_lon) / 2
    centroid_lat = (min_lat + max_lat) / 2
    utm_zone = int((centroid_lon + 180) / 6) + 1
    utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"

    print(f"Using UTM zone {utm_zone} for simplification (tolerance = {simplify_tolerance_m} m)")

    # Define coordinate transformers
    to_utm = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True).transform
    to_wgs = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform

    simplified_polygons = []
    for poly in polygons:
        if not poly.is_valid or poly.area <= 0:
            continue

        poly_m = shp_transform(to_utm, poly)  # project to meters
        poly_simplified_m = poly_m.simplify(simplify_tolerance_m, preserve_topology=True)
        poly_simplified = shp_transform(to_wgs, poly_simplified_m)  # back to EPSG:4326
        simplified_polygons.append(poly_simplified)

    polygons = simplified_polygons

    # --------------------------
    # 7. Save to GeoJSON (EPSG:4326)
    # --------------------------
    geojson_features = []
    for idx, poly in enumerate(polygons):
        lon, lat = poly.centroid.x, poly.centroid.y

        # 2. Map to pixel coordinates (col, row)
        col, row = (~transform) * (lon, lat)
        col, row = int(col), int(row)

        # 3. Safely sample height tensor value
        if (0 <= row < stepdown_heights.shape[0]) and (0 <= col < stepdown_heights.shape[1]):
            h = float(stepdown_heights[row, col])
            usetype = usetype_map[row, col]
        else:
            h = np.nan  # outside bounds
            usetype = None
            
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

    geojson_dict = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": geojson_features
    }

    with open(output_geojson, "w") as f:
        json.dump(geojson_dict, f)

    print(f"✅ Polygonized buildings saved to {output_geojson} (EPSG:4326)")

    return geojson_dict


def handler(params):
    try:
        result = Geojsonify(params)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(result)
        }
    
    except KeyError as e:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Missing parameter: {str(e)}"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
    
