"""
Geometry utilities for polygon processing and conversion
Adapted from parcel_gens.py
"""
import numpy as np
import pyproj
from skimage import measure
from shapely.geometry import Polygon, mapping
from shapely.ops import transform as shp_transform
from rasterio.transform import from_bounds
from pyproj import Geod, Transformer
from PIL import Image
import io


def mask_to_polygons(mask, width, height, bbox, simplify_tolerance_m=5.0):
    """
    Convert a binary mask to simplified polygons in lat/lon coordinates.
    
    Args:
        mask: Binary numpy array (height x width)
        width: Image width in pixels
        height: Image height in pixels
        bbox: Tuple of (lat_min, lat_max, lon_min, lon_max)
        simplify_tolerance_m: Simplification tolerance in meters
        
    Returns:
        List of simplified Shapely Polygon objects in EPSG:4326
    """
    lat_min, lat_max, lon_min, lon_max = bbox
    
    polygons = []
    contours = measure.find_contours(mask, 0.5)  # 0.5 threshold for binary
    
    for contour in contours:
        # contour = N x 2 array of (y, x)
        latlon_points = [
            pixel_to_latlon(x, y, width, height, lat_min, lat_max, lon_min, lon_max)
            for y, x in contour
        ]
        polygons.append(Polygon(latlon_points))

    # Simplify polygons using UTM (meters)
    centroid_lon = (lon_min + lon_max) / 2
    centroid_lat = (lat_min + lat_max) / 2
    utm_zone = int((centroid_lon + 180) / 6) + 1
    utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"

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

    return simplified_polygons


def pixel_to_latlon(x, y, width, height, lat_min, lat_max, lon_min, lon_max):
    """
    Convert pixel coordinates (x, y) to lat/lon
    
    Args:
        x, y: Pixel coordinates
        width, height: Image dimensions
        lat_min, lat_max, lon_min, lon_max: Bounding box
        
    Returns:
        Tuple of (lat, lon)
    """
    lat = lon_min + (x / width) * (lon_max - lon_min)
    lon = lat_max - (y / height) * (lat_max - lat_min)  # top-left origin
    return lat, lon


def split_median(ls, factor=0.6):
    """
    Split a list of values into low/mid/high categories based on median.
    
    Args:
        ls: List of numeric values
        factor: Factor for defining boundaries (default 0.6)
            low: < (1-factor)*median
            high: > (1+factor)*median
            mid: everything else
            
    Returns:
        Dictionary with keys 'low', 'mid', 'high' (None if category is empty)
    """
    int_ls = [int(v) for v in ls]
    mid_result = []
    low_result = []
    high_result = []
    med = np.median(int_ls)
    
    for k in int_ls:
        if k < (1 - factor) * med:
            low_result.append(k)
        elif k > (1 + factor) * med:
            high_result.append(k)
        else:
            mid_result.append(k)

    result = {
        'low': low_result if len(low_result) != 0 else None,
        'mid': mid_result,
        'high': high_result if len(high_result) != 0 else None
    }

    return result


def polygon_to_square_image_bytes_rgba(
    polygon: Polygon,
    resolution_m: float = 1.0,
    colors: dict = None
):
    """
    Convert a polygon to a square RGBA PNG image.

    Args:
        polygon: Shapely polygon (lat/lon).
        resolution_m: pixel size in meters.
        colors: dictionary mapping pixel values to RGBA tuples.
                Example: {0: (0,0,0,255), 1: (255,0,0,255)}

    Returns:
        tuple: (image_bytes, bounds, image_size)
            image_bytes: PNG bytes
            bounds: (min_lon, min_lat, max_lon, max_lat)
            image_size: (width, height) in pixels
    """
    from rasterio.features import rasterize
    
    if colors is None:
        colors = {0: (0, 0, 0, 255), 1: (255, 0, 0, 255)}  # background=black, polygon=red

    fill_value = max(colors.keys())  # polygon value in raster

    # Step 1: Compute polygon bounds
    min_lon, min_lat, max_lon, max_lat = polygon.bounds
    geod = Geod(ellps="WGS84")
    _, _, width_m = geod.inv(min_lon, min_lat, max_lon, min_lat)
    _, _, height_m = geod.inv(min_lon, min_lat, min_lon, max_lat)
    side_m = max(width_m, height_m)
    lon_center = (min_lon + max_lon) / 2
    lat_center = (min_lat + max_lat) / 2
    lat_deg_span = side_m / 111320
    lon_deg_span = side_m / (111320 * np.cos(np.deg2rad(lat_center)))
    lon_min_sq = lon_center - lon_deg_span / 2
    lon_max_sq = lon_center + lon_deg_span / 2
    lat_min_sq = lat_center - lat_deg_span / 2
    lat_max_sq = lat_center + lat_deg_span / 2

    # Step 2: Compute image size
    img_size = int(np.ceil(side_m / resolution_m))
    transform = from_bounds(lon_min_sq, lat_min_sq, lon_max_sq, lat_max_sq, img_size, img_size)

    # Step 3: Rasterize polygon
    image = rasterize(
        [(mapping(polygon), fill_value)],
        out_shape=(img_size, img_size),
        transform=transform,
        fill=0,
        dtype=np.uint8
    )

    # Step 4: Convert to RGBA
    rgba_image = np.zeros((img_size, img_size, 4), dtype=np.uint8)
    for val, rgba in colors.items():
        rgba_image[image == val] = rgba

    # Step 5: Convert to PNG bytes
    pil_img = Image.fromarray(rgba_image, mode="RGBA")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    image_bytes = buf.getvalue()

    return image_bytes, (lon_min_sq, lat_min_sq, lon_max_sq, lat_max_sq), (img_size, img_size)
