import geopandas as gpd
import requests
from collections import defaultdict
import json
import os
from google.colab import files
from google import genai
from google.genai import types
import shutil
import numpy as np
from PIL import Image, PngImagePlugin
from torchvision.utils import save_image

import io
from io import BytesIO
import base64

import matplotlib.pyplot as plt

import cv2
from scipy.ndimage import distance_transform_edt
import rasterio
from rasterio.features import shapes
from rasterio.transform import from_origin, from_bounds
from skimage import measure, morphology
from shapely.geometry import shape, mapping
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import transform as shp_transform

import pyproj
from pyproj import Geod, Transformer
import ast
import re
import math
import time

from matplotlib.patches import Polygon as mplPolygon
from matplotlib.collections import PatchCollection
from scipy import ndimage

class PA_geoJSON():
    def __init__(self, path, bad=None):
        # Load geojson
        with open(path, "r") as f:
            geojson = json.load(f)

        # Set name
        props = geojson.get('properties', {})
        self.name = props.get('Planning_Area') or 'HDB geoJSONs'

        self.features = geojson['features']

        # Organize parcels and building indices
        parcel_to_building = {}
        all_parcels = []
        residential_idx, hdb_idx, commercial_idx, other_idx = [], [], [], []

        for idx, feature in enumerate(self.features):
            props = feature['properties']
            if props.get('heirarchy') == 'parcel':
                if 'buildings' in props:
                    all_parcels.append(idx)
                    parcel_to_building[idx] = props['buildings']

                    landuse = props.get('landuse')
                    if landuse == 'residential':
                        residential_idx.append(idx)
                        if props.get('residential') == 'HDB':
                            hdb_idx.append(idx)
                    elif landuse == 'commercial':
                        commercial_idx.append(idx)
                    else:
                        other_idx.append(idx)

        self.parcels = parcel_to_building
        self.parcels_list = all_parcels
        self.residential = residential_idx
        self.commercial = commercial_idx
        self.hdb = hdb_idx
        self.other = other_idx

        # Remove bad indices if provided
        if bad:
            for trait in [self.parcels_list, self.residential, self.commercial, self.hdb, self.other]:
                trait[:] = [x for x in trait if x not in bad]

    # -----------------------------
    # Export a single or multiple parcels
    # -----------------------------
    def exportParcel(self, parcel, dim=256, name=None, centroid=False):
        if isinstance(parcel, list):
            figs = []
            for p in parcel:
                figs += self._export(p, dim, name, centroid)
        else:
            figs = self._export(parcel, dim, name, centroid)

        output_folder = f"/exported/{name}" if name else f"/exported/{self.name}_output"
        os.makedirs(output_folder, exist_ok=True)

        for fig, path, metadata in figs:
            tmpdir = "/tmp/tmp_export"
            if os.path.exists(tmpdir):
                shutil.rmtree(tmpdir)
            os.makedirs(tmpdir, exist_ok=True)

            tmp_path = os.path.join(tmpdir, "tmp.png")
            fig.savefig(tmp_path, dpi=300, bbox_inches='tight', pad_inches=0)
            plt.close(fig)

            img = Image.open(tmp_path)
            meta = PngImagePlugin.PngInfo()
            for k, v in metadata.items():
                meta.add_text(k, str(v))

            img.save(path, pnginfo=meta)
            shutil.rmtree(tmpdir)

        # Zip and download
        shutil.make_archive(output_folder, 'zip', output_folder)
        files.download(f"{output_folder}.zip")
        shutil.rmtree(output_folder)

    # -----------------------------
    # Internal export logic
    # -----------------------------
    def _export(self, parcel, dim=256, name=None, centroid=False):
        # Gather heights
        heights = []
        building_idxs = self.features[parcel]['properties']['buildings']
        for b_idx in building_idxs:
            try:
                heights.append(self.features[b_idx]['properties']['building:levels'])
            except KeyError:
                pass

        parcel_poly = shape(self.features[parcel]['geometry'])
        building_geom = [shape(self.features[idx]['geometry']) for idx in self.parcels[parcel]]
        centroids = [b.centroid for b in building_geom]

        # Create GeoDataFrames
        gdf_parcel = gpd.GeoDataFrame(geometry=[parcel_poly], crs="EPSG:4326")
        gdf_buildings = gpd.GeoDataFrame(geometry=building_geom, crs="EPSG:4326")
        gdf_centroids = gpd.GeoDataFrame(geometry=centroids, crs="EPSG:4326")

        # Project to UTM
        centroid_lon, centroid_lat = parcel_poly.centroid.x, parcel_poly.centroid.y
        utm_zone = int((centroid_lon + 180) / 6) + 1
        utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"

        gdf_parcel_m = gdf_parcel.to_crs(utm_crs)
        gdf_buildings_m = gdf_buildings.to_crs(utm_crs)
        gdf_centroids_m = gdf_centroids.to_crs(utm_crs)

        # Compute tight square bounds in meters
        minx = min(gdf_parcel_m.total_bounds[0], gdf_buildings_m.total_bounds[0])
        miny = min(gdf_parcel_m.total_bounds[1], gdf_buildings_m.total_bounds[1])
        maxx = max(gdf_parcel_m.total_bounds[2], gdf_buildings_m.total_bounds[2])
        maxy = max(gdf_parcel_m.total_bounds[3], gdf_buildings_m.total_bounds[3])

        dx = maxx - minx
        dy = maxy - miny
        side = max(dx, dy)

        centre_x = (minx + maxx)/2
        centre_y = (miny + maxy)/2

        bounds_m = (centre_x - side/2, centre_x + side/2, centre_y - side/2, centre_y + side/2)
        width_px = height_px = int(np.ceil(side / (dim/256)))  # scale to desired pixel dim
        figsize = (width_px / 300, height_px / 300)  # Matplotlib inches, arbitrary scale

        # Convert bounds back to lat/lon
        transformer = Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True)
        min_lon, min_lat = transformer.transform(bounds_m[0], bounds_m[2])
        max_lon, max_lat = transformer.transform(bounds_m[1], bounds_m[3])
        bounds_latlon = (min_lon, min_lat, max_lon, max_lat)

        metadata = {
            "dimensions_m": side,
            "coordinates": bounds_latlon,
            "levels": str(heights)
        }

        # Prepare file paths
        output_folder = f"/exported/{name}" if name else f"/exported/{self.name}_output"
        os.makedirs(output_folder, exist_ok=True)

        outline_file = os.path.join(output_folder, f"{parcel}_parcel.png")
        fill_file = os.path.join(output_folder, f"{parcel}_buildings.png")
        combined_file = os.path.join(output_folder, f"{parcel}_combined.png")

        figs = []

        # --- Outline only ---
        fig, ax = plt.subplots(figsize=figsize, dpi=300)
        fig.patch.set_facecolor("black")
        ax.set_facecolor("black")
        ax.set_axis_off()
        fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
        gdf_parcel_m.plot(ax=ax, facecolor='red', edgecolor='none', linewidth=1)
        ax.set_xlim(bounds_m[0], bounds_m[1])
        ax.set_ylim(bounds_m[2], bounds_m[3])
        figs.append((fig, outline_file, metadata))

        # --- Fill only ---
        fig, ax = plt.subplots(figsize=figsize, dpi=300)
        fig.patch.set_facecolor("black")
        ax.set_facecolor("black")
        ax.set_axis_off()
        fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
        gdf_buildings_m.plot(ax=ax, facecolor='skyblue', edgecolor='none', alpha=1)
        ax.set_xlim(bounds_m[0], bounds_m[1])
        ax.set_ylim(bounds_m[2], bounds_m[3])
        figs.append((fig, fill_file, metadata))

        # --- Combined ---
        fig, ax = plt.subplots(figsize=figsize, dpi=300)
        fig.patch.set_facecolor("black")
        ax.set_facecolor("black")
        ax.set_axis_off()
        fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
        gdf_parcel_m.plot(ax=ax, facecolor='red', edgecolor='none', alpha=1)
        if centroid:
            gdf_centroids_m.plot(ax=ax, facecolor='skyblue', edgecolor='none', alpha=1, markersize=2)
        else:
            gdf_buildings_m.plot(ax=ax, facecolor='skyblue', edgecolor='none', alpha=1)
        ax.set_xlim(bounds_m[0], bounds_m[1])
        ax.set_ylim(bounds_m[2], bounds_m[3])
        figs.append((fig, combined_file, metadata))

        return figs

    # -----------------------------
    # Plot single parcel
    # -----------------------------
    def plot(self, parcel):
        parcel_poly = shape(self.features[parcel]['geometry'])
        building_geom = [shape(self.features[idx]['geometry']) for idx in self.parcels[parcel]]
        centroids = [b.centroid for b in building_geom]

        gdf_parcel = gpd.GeoDataFrame(geometry=[parcel_poly], crs="EPSG:4326")
        gdf_buildings = gpd.GeoDataFrame(geometry=building_geom, crs="EPSG:4326")
        gdf_centroids = gpd.GeoDataFrame(geometry=centroids, crs="EPSG:4326")

        fig, ax = plt.subplots(figsize=(12,12))
        ax.set_axis_off()
        gdf_parcel.plot(ax=ax, facecolor='none', edgecolor='red', linewidth=1)
        gdf_buildings.plot(ax=ax, facecolor='skyblue', edgecolor='none', alpha=1)
        gdf_centroids.plot(ax=ax, facecolor='green', edgecolor='none', alpha=1)
        plt.title(f"Parcel {parcel}")
        plt.show()

    # -----------------------------
    # Plot all parcels
    # -----------------------------
    def plotAll(self):
        for parcel_idx in self.parcels:
            self.plot(parcel_idx)

import numpy as np
from shapely.geometry import Polygon, mapping
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from pyproj import Geod
from PIL import Image
import io

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
        image_bytes: PNG bytes
        bounds: (min_lon, min_lat, max_lon, max_lat)
        image_size: (width, height) in pixels
    """
    if colors is None:
        colors = {0: (0,0,0,255), 1: (255,0,0,255)}  # background=black, polygon=red

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

import time
import traceback
from google.api_core import exceptions as google_exceptions

def safe_generate(client, model, contents, max_retries=3, backoff=2.0):
    attempt = 1
    while attempt <= max_retries:
        try:
            print(f"Sending request (attempt {attempt})...")
            t0 = time.perf_counter()

            response = client.models.generate_content(
                model=model,
                contents=contents
            )

            dt = time.perf_counter() - t0
            print(f"✓ Request succeeded in {dt:.2f}s")
            return {"ok": True, "response": response}

        except google_exceptions.ResourceExhausted as e:
            # Rate limit / quota exceeded
            print(f"🚫 Rate limit / quota exceeded: {e.message}")
            if attempt == max_retries:
                return {"ok": False, "error": "rate_limit", "message": str(e)}

        except google_exceptions.DeadlineExceeded as e:
            # Timeout
            print(f"⏳ Request timed out: {e.message}")
            if attempt == max_retries:
                return {"ok": False, "error": "timeout", "message": str(e)}

        except google_exceptions.ServiceUnavailable as e:
            # Temporary backend issue
            print(f"⚠️ Service unavailable: {e.message}")
            if attempt == max_retries:
                return {"ok": False, "error": "unavailable", "message": str(e)}

        except google_exceptions.GoogleAPIError as e:
            # Other Google API errors
            print(f"❌ API Error: {e.message}")
            return {"ok": False, "error": "api_error", "message": str(e)}

        except Exception as e:
            # Anything else
            print("❗ Unexpected error:")
            traceback.print_exc()
            return {
                "ok": False,
                "error": "unexpected",
                "message": str(e),
                "traceback": traceback.format_exc(),
            }

        # Backoff and retry
        sleep_time = backoff ** attempt
        print(f"Retrying in {sleep_time:.1f}s...\n")
        time.sleep(sleep_time)
        attempt += 1

from skimage import measure
from shapely.geometry import Polygon

def mask_to_polygons(mask, width, height, bbox):
    simplify_tolerance_m = 5.0
    lat_min, lat_max, lon_min, lon_max = bbox
    print(lat_min, lat_max, lon_min, lon_max)
    polygons = []
    contours = measure.find_contours(mask, 0.5)  # 0.5 threshold for binary
    for contour in contours:
        # contour = N x 2 array of (y, x)
        latlon_points = [pixel_to_latlon(x, y, width, height, lat_min, lat_max, lon_min, lon_max)
                         for y, x in contour]
        polygons.append(Polygon(latlon_points))

    # --------------------------
    # 6. Simplify polygons using UTM (meters)
    # --------------------------
    # Determine approximate UTM zone from bounding box centroid
    centroid_lon = (lon_min + lon_max) / 2
    centroid_lat = (lat_min + lat_max) / 2
    utm_zone = int((centroid_lon + 180) / 6) + 1
    utm_crs = f"+proj=utm +zone={utm_zone} +datum=WGS84 +units=m +no_defs"

    print(f"Using UTM zone {utm_zone} for simplification (tolerance = {simplify_tolerance_m} m)")

    # Define coordinate transformers
    to_utm = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True).transform
    to_wgs = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform

    simplified_polygons = []
    all_areas = []
    for poly in polygons:
        if not poly.is_valid or poly.area <= 0:
            continue

        poly_m = shp_transform(to_utm, poly)  # project to meters
        poly_simplified_m = poly_m.simplify(simplify_tolerance_m, preserve_topology=True)
        poly_simplified = shp_transform(to_wgs, poly_simplified_m)  # back to EPSG:4326
        simplified_polygons.append(poly_simplified)
        all_areas.append(poly_simplified.area)

    return simplified_polygons

from rasterio.features import shapes
from shapely.geometry import shape, mapping

def binary_to_polygons(binary_map, transform):
    """
    Convert binary map to shapely geometries in lat/lon coordinates.
    """
    polygons = []
    for geom, value in shapes(binary_map.astype(np.uint8), mask=binary_map.astype(bool), transform=transform):
        polygons.append(shape(geom))
    return polygons

def pixel_to_latlon(x, y, width, height, lat_min, lat_max, lon_min, lon_max):
    """
    Convert pixel coordinates (x, y) to lat/lon
    """
    lat = lon_min + (x / width) * (lon_max - lon_min)
    lon = lat_max - (y / height) * (lat_max - lat_min)  # top-left origin
    return lat, lon

def splitMedian(ls, factor = 0.6):
  int_ls = [int(v) for v in ls]
  mid_result = []
  low_result = []
  high_result = []
  med = np.median(int_ls)
  print(med)
  for k in int_ls:
    if k < (1-factor)*med:
      low_result.append(k)
    elif k > (1+factor)*med:
      high_result.append(k)
    else:
      mid_result.append(k)

  if len(low_result) != 0:
    low = low_result
  else:
    low = None

  if len(high_result) != 0:
    high = high_result
  else:
    high = None

  result = {
      'low': low,
      'mid': mid_result,
      'high': high
  }

  return result

def sortedArea(geojson, zone='Residential', town='PUNGGOL'):
  all_plot_areas = {}

  if zone == 'Residential':
    for idx in geojson.hdb:
      img = Image.open(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/PNGs/{town}/{town}_hdbs_f/{idx}_combined.png")
      area = float(img.info['dimensions_m'])
      all_plot_areas[idx] = area

  elif zone == 'Commercial':
    for idx in geojson.commercial:
      img = Image.open(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/PNGs/COMMERCIAL/Commercial/{idx}_combined.png")
      area = float(img.info['dimensions_m'])
      all_plot_areas[idx] = area

  sorted_area_idxs = sorted(all_plot_areas, key=all_plot_areas.get)
  sorted_area_ls = sorted([area for area in all_plot_areas.values()])
  # print(sorted_area_idxs)
  return all_plot_areas, sorted_area_idxs, sorted_area_ls

def findScaleRef(area, sai, sal, window = 2):
  idx = min(range(len(sal)), key=lambda i: abs(sal[i] - area))
  # idx = ls.index(parcel)
  idx_ls = [x for x in range(len(sai))]

  excess_L, excess_R = idx - (window/2), idx + (window/2)

  if excess_L < 0:
    wL = int(window/2 + excess_L)
    wR = int(window/2 - excess_L)
  elif excess_R > len(sai) - 1:
    wL = int(window/2 + excess_R - (len(sai)-1))
    wR = int(window/2 - excess_R + (len(sai)-1))
  else:
    wL = int(window/2)
    wR = int(window/2)

  result = sorted([-c-1+idx for c in range(wL)] + [idx] + [c+1+idx for c in range(wR)])

  return [sai[res] for res in result]

# ## PROMPT ARCHIVE, WORKING AS OF 12/9/2025
# f"The first attached image is an urban development parcel in Singapore, with image square bounds of {str(dimensions)} metres. Populate the red parcel with 2D building footprints representing residential HDB blocks. Take into account Singaporean HDB building typologies, orientation and placement. Take inspiration from Punggol's developmental styles. For the output, render an image of the same size, with the building footprint coloured in with light-blue. Only populate the inner red region with building footprints. Ensure the scale provided is maintained, and any building footprints generated have realistic scale. Use the following as examples of other populated building parcels in the town, keeping in mind how their typology sizes correlate with their respective image bound scales provided. Pay attention to how only 1 or 2 typologies are used. ENSURE THE IMAGE ONLY HAS RED AND LIGHT-BLUE (#83C7EC) SHAPES. **DO NOT CHANGE THE SIZE OR SHAPE OF THE ORIGINAL PARCEL PROVIDED.**"

def nanoBanana(parcel_bytes, dimensions, sai, sal, zone='Residential', town='PUNGGOL', name='result', fucked=False):
  if zone == 'Residential':
    path = f"/content/drive/MyDrive/SUTD/Term 7/Spatial/geoJSONS by PA/{town}.geojson"
  elif zone == 'Commercial':
    path = "/content/drive/MyDrive/SUTD/Term 7/Spatial/geoJSONS by PA/commercial.geojson"

  town = town.upper()
  parcel_bytes = parcel_bytes.getvalue()
  if fucked == True:
    model = "gemini-2.5-flash-image"
  else:
    model = "gemini-3-pro-image-preview"

  # parcel = readImage(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/PNGs/PUNGGOL/PUNGGOL_hdbs_f/{parcel_idx}_parcel.png", disp=False)
  # def findScaleRef(area, geojson, zone='Residential', town='PUNGGOL', window = 2, ls=sorted_area_idxs):
  ref_idx = findScaleRef(float(dimensions), sai, sal)

  if zone=='Residential':
    building_prompt = "residential HDB blocks"
    ref = [readImage(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/PNGs/{town}/{town}_hdbs_f/{idx}_combined.png") for idx in ref_idx]
  elif zone == 'Commercial':
    building_prompt = "commercial buildings"
    ref = [readImage(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/PNGs/COMMERCIAL/Commercial/{idx}_combined.png") for idx in ref_idx]
  # levels = [reference[1]['levels'] for reference in ref]

  levels = []
  for reference in ref:
    lvl_lst = ast.literal_eval(reference[1]['levels'])
    levels += lvl_lst

  # Darrels: AIzaSyCyw2ydzGmOETHP9mZ-T9j5cheLFkCqNaU
  # Mine: AIzaSyDFe8XUFZ_RcS_HL36R2Ny6bD5_zEiwm9U
  # Ky: AIzaSyATlaHHFr_DsM7Z-Ds0QupjsbqOyS-0d04
  client = genai.Client(http_options={'api_version': 'v1alpha'}, api_key="AIzaSyATlaHHFr_DsM7Z-Ds0QupjsbqOyS-0d04")
  refined_prompt = f"The first attached image is an urban development parcel in Singapore, with image square bounds of {str(dimensions)} metres. Populate the red parcel with 2D building footprints representing {building_prompt}. Take into account Singaporean HDB building typologies, orientation and placement. Take inspiration from {town.title()}'s developmental styles. For the output, render an image of the same size with a black background, with building footprints coloured in with light-blue. Only populate the inner red region with building footprints. Ensure the scale provided is maintained, and any building footprints generated have realistic scale. Use the following as examples of other populated building parcels in the town, keeping in mind how their typology sizes correlate with their respective image bound scales provided. Pay attention to how only 1 or 2 typologies are used. ENSURE THE IMAGE ONLY HAS RED AND LIGHT-BLUE (#83C7EC) SHAPES. **DO NOT CHANGE THE SIZE OR SHAPE OF THE ORIGINAL PARCEL PROVIDED.** Negative Prompt: black outlines, 3D, shadows, isometric views, buildings outside the red parcel, changing the parcel"

  contents=[
          types.Content(
              parts=[
                  types.Part(text="PARCEL_IMAGE:"),

                  types.Part(
                      inline_data=types.Blob(
                          mime_type="image/png",
                          data=parcel_bytes,
                      ),
                      media_resolution={"level": "media_resolution_medium"}
                  ),

                  types.Part(text="REFERENCE_EXAMPLES:"),

                  types.Part(
                      inline_data=types.Blob(
                          mime_type="image/png",
                          data=ref[0][0],
                      ),
                      media_resolution={"level": "media_resolution_medium"}
                  ),
                  types.Part(text=f"{float(ref[0][1]['dimensions_m']):.2f} metres"),

                  types.Part(
                      inline_data=types.Blob(
                          mime_type="image/png",
                          data=ref[1][0],
                      ),
                      media_resolution={"level": "media_resolution_medium"}
                  ),
                  types.Part(text=f"{float(ref[1][1]['dimensions_m']):.2f} metres"),

                  types.Part(
                      inline_data=types.Blob(
                          mime_type="image/png",
                          data=ref[2][0],
                      ),
                      media_resolution={"level": "media_resolution_medium"}
                  ),
                  types.Part(text=f"{float(ref[2][1]['dimensions_m']):.2f} metres"),

                  # types.Part(
                  #     inline_data=types.Blob(
                  #         mime_type="image/png",
                  #         data=ref[3][0],
                  #     ),
                  #     media_resolution={"level": "media_resolution_medium"}
                  # ),
                  # types.Part(text=f"{float(ref[3][1]['dimensions_m']):.2f} metres"),

                  types.Part(text=refined_prompt),
              ]
          )
      ]

  print('Sending request...')
  t0 = time.perf_counter()
  result = safe_generate(client, model, contents)

  if result["ok"]:
    response = result["response"]
  else:
    print("❌ Request failed:", result["error"])
    # print(result["message"])
    print("Shits fucked........")
    return None, "Fucked"

  # response = client.models.generate_content(
  #     model=model,

  # )

  # ---- Parse returned image ----
  print("Parsing response...")
  output_bytes = response.candidates[0].content.parts[0].inline_data.data
  t_api = time.perf_counter() - t0

  print("Saving response...")

  with open(f"{name}.png", "wb") as f:
      f.write(output_bytes)

  print(f"Image saved as {name}.png")
  print(f"Time taken: {t_api:.3f} s")

  print(levels)
  return output_bytes, levels

def parseParcels(image, coords):
  res = extract_maps(image)
  img = Image.open(image)
  img_np = np.array(img)

  # Assume your binary masks are already extracted
  # mask1, mask2, mask3 (shape: height x width)
  height, width = img_np.shape[:2]

  lon_min = min(p[0] for p in coords['coordinates'][0])
  lon_max = max(p[0] for p in coords['coordinates'][0])
  lat_min = min(p[1] for p in coords['coordinates'][0])
  lat_max = max(p[1] for p in coords['coordinates'][0])

  bounds = (lon_min, lat_min, lon_max, lat_max)

  r_poly = mask_to_polygons(res[0], width, height, (lat_min, lat_max, lon_min, lon_max))
  c_poly = mask_to_polygons(res[1], width, height, (lat_min, lat_max, lon_min, lon_max))
  # w_poly = mask_to_polygons(res[2], width, height, (lat_min, lat_max, lon_min, lon_max))
  # g_poly = mask_to_polygons(res[5], width, height, (lat_min, lat_max, lon_min, lon_max))
  roads = mask_to_polygons(res[4], width, height, (lat_min, lat_max, lon_min, lon_max))

  return bounds, r_poly, c_poly, res[2], res[3], roads

def Geojsonify(input_img, bbox, heights=None, zone='Residential', output_geojson="output", single_parcel=True):
    building_threshold = 210
    min_area_ratio = 0.0001
    simplify_tolerance_m = 2.0

    # img = cv2.imread(input_img)
    img = cv2.imdecode(input_img, cv2.IMREAD_COLOR)
    b, g, r = cv2.split(img)

    building_map = np.where((r < building_threshold) & (g < building_threshold) & (b > building_threshold), 1, 0)

    # --------------------------
    # 2. Load bounding box GeoJSON (EPSG:4326)
    # --------------------------
    print(type(bbox))
    # bbox = [float(x) for x in re.findall(r'[-+]?\d*\.\d+|\d+', bbox)]
    print(bbox)
    min_lon, min_lat, max_lon, max_lat = bbox


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
    all_areas = []
    for poly in polygons:
        if not poly.is_valid or poly.area <= 0:
            continue

        poly_m = shp_transform(to_utm, poly)  # project to meters
        poly_simplified_m = poly_m.simplify(simplify_tolerance_m, preserve_topology=True)
        poly_simplified = shp_transform(to_wgs, poly_simplified_m)  # back to EPSG:4326
        simplified_polygons.append(poly_simplified)
        all_areas.append(poly_simplified.area)

    polygons = simplified_polygons
    median_area = np.median(all_areas)
    if heights == None:
      if zone == 'Residential':
        heights = ['17', '17', '17', '17', '17', '17', '17', '17', '7', '7', '17', '17', '17', '17']
      elif zone == 'Commercial':
        heights = ['4','4','4','4','4','6','6','6','6','6','6','6','6','6','10','10','10','10']
    split_heights = splitMedian(heights)

    if split_heights['low'] == None:
      if zone == 'Residential':
        l_h = 5
      elif zone == 'Commercial':
        l_h= 1
    else:
      l_h = int(np.median(split_heights['low']))

    if split_heights['high'] == None:
      if zone == 'Residential':
        h_h = 25
      elif zone == 'Commercial':
        h_h= 10
    else:
      h_h = int(np.median(split_heights['high']))

    if split_heights['mid'] == None or len(split_heights['mid']) == 0:
      if zone == 'Residential':
        m_h = 17
      elif zone == 'Commercial':
        m_h= 6
    else:
      m_h = int(np.median(split_heights['mid']))


    # --------------------------
    # 7. Save to GeoJSON (EPSG:4326)
    # --------------------------
    geojson_features = []
    for idx, poly in enumerate(polygons):

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
              "levels": h,
              "height": h * 3,
              "type": zone.lower(),
              "area": poly.area
              }
      })

    geojson_dict = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": geojson_features
    }

    with open(f'{output_geojson}.geojson', "w") as f:
        json.dump(geojson_dict, f)

    print(f"✅ Polygonized buildings saved to {output_geojson}.geojson (EPSG:4326)")

    if single_parcel==True:
      return geojson_dict
    else:
      return geojson_features
    
def weBall(image, coords, town):
  output_template = {
      "type": "FeatureCollection",
      "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
  }

  (lon_min, lat_min, lon_max, lat_max), r_poly, c_poly, w_map, g_map, roads = parseParcels(image, coords)
  punggol_bad = [0,55,62,63,67,68,80,81,82]
  geojsons = []

  print("Generating Commercial parcels...")
  print("\n\n")
  geojson = PA_geoJSON("/content/drive/MyDrive/SUTD/Term 7/Spatial/geoJSONS by PA/commercial.geojson")
  apa, sai, sal = sortedArea(geojson, zone='Commercial')

  for commercial in c_poly:
    flag, output = parcelGeneration(commercial, sai, sal, zone='Commercial', single_parcel=False)
    if flag == True:
      geojsons += output
    elif flag == False:
      pass
    else:
      raise RuntimeError((f"nanoBanana is fucked."))

  print("Generating Residential parcels...")
  print("\n\n")

  geojson = PA_geoJSON(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/geoJSONS by PA/{town}.geojson", punggol_bad)
  apa, sai, sal = sortedArea(geojson, zone='Residential', town=town)

  for hdb in r_poly:
    flag, output = parcelGeneration(hdb, sai, sal, zone='Residential', town='PUNGGOL', single_parcel=False)
    if flag == True:
      geojsons += output
    elif flag == False:
      pass
    else:
      raise RuntimeError(f"nanoBanana is fucked.")

  output_template['features'] = geojsons
  with open(f'pre_water.geojson', "w") as f:
    json.dump(output_template, f)

  adjusted_geojsons = siteAdjust(geojsons, w_map, g_map, (lon_min, lat_min, lon_max, lat_max))

  output_template['features'] = adjusted_geojsons
  with open(f'{image}_output.geojson', "w") as f:
    json.dump(output_template, f)

  return output_template

  print(f"$$$$$BALLING$$$$$")
def siteAdjust(geoms, w_map, g_map, bbox, threshold_m = 100.0, LPM = 4, disp=False):
  geometries = [shape(feat['geometry']) for feat in geoms]


  # water_map = np.flipud(w_map)
  c_map = w_map + g_map

  height, width = c_map.shape
  bounds = bbox

  transformer = Transformer.from_crs("EPSG:4326", "EPSG:32648", always_xy=True)
  min_x, min_y = transformer.transform(bounds[0], bounds[1])
  max_x, max_y = transformer.transform(bounds[2], bounds[3])


  distance_map = distance_transform_edt(c_map == 0)
  pixel_size_x = (max_x - min_x) / width
  pixel_size_y = (max_y - min_y) / height
  pixel_size = (pixel_size_x + pixel_size_y) / 2

  def meters_to_pixel(x_m, y_m, min_x, min_y, max_x, max_y, width, height): # X-FLIP
      px = (x_m - min_x) / (max_x - min_x) * (width - 1)
      py = (max_y - y_m) / (max_y - min_y) * (height - 1)
      # px = (width - 1) - px
      # py = (height - 1) - py
      return int(np.clip(px, 0, width - 1)), int(np.clip(py, 0, height - 1))

  def waterHeight(distance_m):
      levels = int(distance_m / LPM) + 1
      return levels, levels * 3

  for feature, geom in zip(geoms, geometries):
      lon, lat = geom.centroid.x, geom.centroid.y
      x_m, y_m = transformer.transform(lon, lat)

      px, py = meters_to_pixel(x_m, y_m, min_x, min_y, max_x, max_y, width, height)
      dist_m = distance_map[py, px] * pixel_size
      # print(px, py)

      if dist_m <= threshold_m:
          levels, height_val = waterHeight(dist_m)
          feature['properties']['levels'] = min(levels, feature['properties']['levels'])
          feature['properties']['height'] = min(height_val, feature['properties']['height'])
      else:
          pass

  print("Updated GeoJSON with heights assigned based on water distance.")

  if disp == True:
    fig, ax = plt.subplots(figsize=(12, 12))
    ax.imshow(c_map, cmap='Blues', extent=[0, width, 0, height])

    patches = []
    facecolors = []

    for feature, geom in zip(geoms, geometries):
        px, py = meters_to_pixel(*transformer.transform(geom.centroid.x, geom.centroid.y),
                                  min_x, min_y, max_x, max_y, width, height)
        dist_m = distance_map[py, px] * pixel_size

        alpha = max(0.1, 1 - dist_m / threshold_m) if dist_m <= threshold_m else 0.1

        def geom_to_pixels(g):
            coords = []
            if isinstance(g, Polygon):
                coords = []
                for x, y in np.array(g.exterior.coords):
                    px, py = meters_to_pixel(*transformer.transform(x, y),
                                              min_x, min_y, max_x, max_y, width, height)
                    py = height - py
                    coords.append([px, py])
            elif isinstance(g, MultiPolygon):
                for part in g.geoms:
                    coords += geom_to_pixels(part)
            return coords

        poly_coords = geom_to_pixels(geom)
        if poly_coords:
            patch = mplPolygon(poly_coords, closed=True)
            patches.append(patch)
            facecolors.append((1.0, 0, 0, alpha))

    pc = PatchCollection(patches, edgecolor='black', facecolor=facecolors)
    ax.add_collection(pc)

    ax.set_xlim(0, width)
    ax.set_ylim(0, height)
    ax.set_aspect('equal')
    ax.axis('off')

    plt.show()

  return geoms

import numpy as np
from PIL import Image
from shapely.geometry import Polygon, MultiPolygon, Point
from shapely.ops import unary_union
from skimage import measure
from scipy.ndimage import binary_fill_holes, binary_closing
from skimage.morphology import square

def shape_from_bytes(img_bytes, red_min=(150,0,0), red_max=(255,100,100), min_area=1.0):
    # Load image
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    arr = np.array(img)

    # Mask red regions
    mask = np.all((arr >= red_min) & (arr <= red_max), axis=2)

    # Clean mask
    mask = binary_fill_holes(mask)
    mask = binary_closing(mask, structure=square(3))

    # Pad edges to avoid splitting
    mask = np.pad(mask, pad_width=1, mode='constant', constant_values=0)
    contours = measure.find_contours(mask.astype(float), 0.5)
    contours = [c - 1 for c in contours]  # remove padding offset

    # Convert contours to Shapely polygons
    polys = [Polygon([(x, mask.shape[0]-y) for y, x in c]) for c in contours]
    polys_valid = [p for p in polys if p.is_valid and p.area >= min_area]

    # Merge all polygons
    if not polys_valid:
        return None
    merged = unary_union(polys_valid)
    return merged, img.size


def rasterize_shape(shape_obj, size=(64,64)):
    from shapely.affinity import affine_transform

    if shape_obj is None:
        return np.zeros(size, dtype=np.uint8)

    # Get bounds
    minx, miny, maxx, maxy = shape_obj.bounds
    scale_x = (size[1]-1)/(maxx - minx) if maxx>minx else 1
    scale_y = (size[0]-1)/(maxy - miny) if maxy>miny else 1

    # Transform to fit grid
    trans = [scale_x, 0, 0, scale_y, -minx*scale_x, -miny*scale_y]
    shape_scaled = affine_transform(shape_obj, trans)

    # Rasterize
    grid = np.zeros(size, dtype=np.uint8)
    for i in range(size[0]):
        for j in range(size[1]):
            px = j + 0.5
            py = i + 0.5
            if shape_scaled.contains(Point(px, py)):
                grid[i,j] = 1
    return grid


def shape_similarity(grid1, grid2):
    intersection = np.logical_and(grid1, grid2).sum()
    union = np.logical_or(grid1, grid2).sum()
    return intersection / union if union>0 else 0.0

def display_shapes(grid1, grid2, titles=("Shape 1", "Shape 2")):
    fig, axes = plt.subplots(1, 2, figsize=(10, 5))

    axes[0].imshow(grid1, cmap='Reds', interpolation='none')
    axes[0].set_title(titles[0])
    axes[0].axis('off')

    axes[1].imshow(grid2, cmap='Reds', interpolation='none')
    axes[1].set_title(titles[1])
    axes[1].axis('off')

    plt.show()

def checkSimilarity(byte1, byte2):
  shape1, i_size = shape_from_bytes(byte1)
  shape2, o_size = shape_from_bytes(byte2)
  grid1 = rasterize_shape(shape1, size=i_size)
  grid2 = rasterize_shape(shape2, size=i_size)
  similarity = shape_similarity(grid1, grid2)
  display_shapes(grid1, grid2)
  print("Shape similarity (IoU):", similarity)
  return similarity > 0.95

def cleanMap(map, min_size=300):
  labeled, num_features = ndimage.label(map == 1)
  sizes = ndimage.sum(map == 1, labeled, range(1, num_features + 1))

  cleaned = np.zeros_like(map, dtype=np.uint8)

  for i, size in enumerate(sizes):
      if size >= min_size:          # keep only large water bodies
          cleaned[labeled == (i+1)] = 1

  return cleaned

def extract_maps(basemap, save=False): # extracts building and water|land maps from generated png ( png input -> terrain + building maps as nparrays )
  img = cv2.imread(basemap)  # BGR format in OpenCV

  # Split channels
  b, g, r = cv2.split(img)

  # Define threshold for red detection
  water_threshold = 150  # tweak as needed, defaults: building = 170, water = 200
  green_threshold = 110
  residential_threshold = 100
  commercial_threshold = 210
  tolerance = 85
  road_r_target = 160  # int(hex_color[1:3], 16)
  road_g_target = 160  # int(hex_color[3:5], 16)
  road_b_target = 160  # int(hex_color[5:7], 16)

  # Create binary mask: 1 if red is strong and green/blue are weak
  residential_map = np.where((r > residential_threshold) & (g < residential_threshold) & (b < residential_threshold), 1, 0)
  commercial_map = np.where((r > commercial_threshold) & (g > commercial_threshold) & (b < commercial_threshold), 1, 0)
  water_map = np.where((b > water_threshold) & (g < water_threshold) & (r < water_threshold), 1, 0)
  green_map = np.where((b < green_threshold) & (g > green_threshold) & (r < green_threshold), 1, 0)
  road_map = np.where(
      (np.abs(r - road_r_target) <= tolerance) &
      (np.abs(g - road_g_target) <= tolerance) &
      (np.abs(b - road_b_target) <= tolerance),
      1,
      0
  )

  residential_map = cleanMap(residential_map)
  commercial_map = cleanMap(commercial_map)
  water_map = cleanMap(water_map)
  green_map = cleanMap(green_map)

  # Optional: save as image
  if save:
    cv2.imwrite("residential_map.png", (residential_map * 255).astype(np.uint8))
    cv2.imwrite("commercial_map.png", (commercial_map * 255).astype(np.uint8))
    cv2.imwrite("terrain_map.png", (water_map * 255).astype(np.uint8))
    cv2.imwrite("road_map.png", (road_map * 255).astype(np.uint8))

  plt.figure(figsize=(30, 18))
  plt.subplot(1, 5, 1)
  plt.imshow(residential_map, cmap="gray")
  plt.title("Residential Map")
  plt.axis("off")

  plt.subplot(1, 5, 2)
  plt.imshow(commercial_map, cmap="gray")
  plt.title("Commercial Map")
  plt.axis("off")

  plt.subplot(1, 5, 3)
  plt.imshow(water_map, cmap="gray")
  plt.title("Water Map (Blue Regions)")
  plt.axis("off")

  plt.subplot(1, 5, 4)
  plt.imshow(green_map, cmap="gray")
  plt.title("Green Map (Blue Regions)")
  plt.axis("off")

  plt.subplot(1, 5, 5)
  plt.imshow(road_map, cmap="gray")
  plt.title("Road Map (Blue Regions)")
  plt.axis("off")

  plt.tight_layout()
  plt.show()

  return residential_map, commercial_map, water_map, green_map, road_map

def parcelGeneration(parcel, sai, sal, zone='Residential', town='PUNGGOL', output_name='output', single_parcel=True, fucked=False, max_retry = 5):
  image_bytes, bounds, size = polygon_to_square_image_bytes_rgba(parcel, resolution_m=1.0)

  if float(size[0]) < 100:
    print("Parcel too small, skipping parcel.")
    return False, None

  img = Image.open(io.BytesIO(image_bytes))
  display(img)
  print(size)
  parcel_bytes = io.BytesIO(image_bytes)
  # parcel_data = readImage(f"/content/drive/MyDrive/SUTD/Term 7/Spatial/PNGs/PUNGGOL/PUNGGOL_hdbs_f/{parcel}_parcel.png")

  qc = False
  attempts = 0
  while not qc and attempts < max_retry:
    attempts += 1

    nanoresult, level_dict = nanoBanana(parcel_bytes, size[0], sai, sal, zone=zone, town=town, name=output_name, fucked=fucked)
    if level_dict == "Fucked":
      return None, nanoresult

    img_d = Image.open(io.BytesIO(nanoresult))
    plt.figure(figsize=(6,6))
    plt.imshow(img_d)
    plt.axis('off')
    plt.show()

    print("Checking generation quality...")
    qc = checkSimilarity(image_bytes, nanoresult)
    if not qc:
        print(f"Failed QC on attempt {attempts}, re-generating...")

  if not qc:
    print("Max attempts reached, returning last result anyway.")

  img = np.frombuffer(nanoresult, np.uint8)
  # print(bounds)
  result = Geojsonify(img, bounds, level_dict, single_parcel=single_parcel) # PARCEL_DATA PASSES IN COORDINATES

  return True, result

# testing metadata readability

def readImage(path, disp=True):
  img = Image.open(path)

  if disp:
    plt.imshow(img)
    plt.axis('off')  # hide axes
    plt.show()

    # Show metadata
    print("Image format:", img.format)
    print("Image size:", img.size)
    print("Image mode:", img.mode)

    # If the image contains EXIF metadata:
    print("Saved metadata:")
    for k, v in img.info.items():
        print(f"{k}: {v}")

  buffer = io.BytesIO()
  img.save(buffer, format="PNG")
  img_bytes = buffer.getvalue()

  return img_bytes, img.info



################################# Usage Code ####################################

coords_f = { #  Provide Coords of Parcel Map
  "type": "Polygon",
  "coordinates": [
    [
      [
        103.80118661426008,
        1.2727073042235681
      ],
      [
        103.80118661426008,
        1.262192916646191
      ],
      [
        103.81360486018805,
        1.262192916646191
      ],
      [
        103.81360486018805,
        1.2727073042235681
      ],
      [
        103.80118661426008,
        1.2727073042235681
      ]
    ]
  ]
}

pleasework = weBall("1210.png", coords_f, "PUNGGOL") #  Send <filename>, <coords>, "Town name in all-caps"