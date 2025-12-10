"""
Reference data manager for parcel generation.
Indexes PNG metadata and enables similarity-based lookup.
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np
from PIL import Image, PngImagePlugin


class ReferenceDataManager:
    """Load and index reference parcel PNGs with metadata."""

    def __init__(self, geojson_dir: str, png_dir: str):
        """
        Initialize reference data manager.

        Args:
            geojson_dir: Path to directory containing geojson files (PUNGGOL.geojson, commercial.geojson)
            png_dir: Path to directory containing PNG folders (PUNGGOL_hdbs_f/, Commercial/)
        """
        self.geojson_dir = geojson_dir
        self.png_dir = png_dir
        self.residential_data: Dict[int, Dict] = {}
        self.commercial_data: Dict[int, Dict] = {}
        self._load_all()

    def _load_all(self):
        """Load all reference data."""
        self._load_geojson()
        self._load_pngs()

    def _load_geojson(self):
        """Load geojson feature data indexed by parcel ID."""
        # Load PUNGGOL (residential)
        punggol_path = os.path.join(self.geojson_dir, "PUNGGOL.geojson")
        if os.path.exists(punggol_path):
            with open(punggol_path) as f:
                data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    # Extract parcel ID from feature (assuming index-based)
                    # Store basic properties
                    parcel_id = props.get("@id")
                    if parcel_id:
                        self.residential_data[parcel_id] = {
                            "properties": props,
                            "geometry": feature.get("geometry"),
                        }

        # Load Commercial
        commercial_path = os.path.join(self.geojson_dir, "commercial.geojson")
        if os.path.exists(commercial_path):
            with open(commercial_path) as f:
                data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    parcel_id = props.get("@id")
                    if parcel_id:
                        self.commercial_data[parcel_id] = {
                            "properties": props,
                            "geometry": feature.get("geometry"),
                        }

    def _load_pngs(self):
        """Scan PNG directories and extract metadata."""
        self._index_png_folder("PUNGGOL_hdbs_f", self.residential_data, "residential")
        self._index_png_folder("Commercial", self.commercial_data, "commercial")

    def _index_png_folder(self, folder_name: str, data_dict: Dict, zone: str):
        """Index all *_combined.png files in a folder, extracting metadata."""
        folder_path = os.path.join(self.png_dir, folder_name)
        if not os.path.isdir(folder_path):
            return

        for png_file in os.listdir(folder_path):
            if not png_file.endswith("_combined.png"):
                continue

            file_path = os.path.join(folder_path, png_file)
            try:
                img = Image.open(file_path)
                # Extract metadata from PNG info
                info = img.info or {}
                parcel_idx = png_file.replace("_combined.png", "")

                entry = {
                    "png_path": file_path,
                    "zone": zone,
                    "dimensions_m": float(info.get("dimensions_m", 100)),
                    "levels": info.get("levels", "[]"),
                    "coordinates": info.get("coordinates", ""),
                    "folder": folder_name,
                    "basename": parcel_idx,
                }
                data_dict[f"{folder_name}_{parcel_idx}"] = entry
            except Exception as e:
                print(f"Warning: Could not load {file_path}: {e}")

    def get_residential_references(self, area_m2: float, window: int = 3) -> List[Dict]:
        """
        Get reference residential parcels similar in size to area_m2.

        Args:
            area_m2: Target area in square meters
            window: Number of similar references to return on each side

        Returns:
            List of reference data dicts with 'png_path', 'dimensions_m', 'levels'
        """
        return self._get_similar_references(self.residential_data, area_m2, window)

    def get_commercial_references(self, area_m2: float, window: int = 3) -> List[Dict]:
        """
        Get reference commercial parcels similar in size to area_m2.

        Args:
            area_m2: Target area in square meters
            window: Number of similar references to return on each side

        Returns:
            List of reference data dicts with 'png_path', 'dimensions_m', 'levels'
        """
        return self._get_similar_references(self.commercial_data, area_m2, window)

    def _get_similar_references(self, data_dict: Dict, area_m2: float, window: int) -> List[Dict]:
        """Find similar-sized references by area."""
        # Filter out entries without PNG paths
        png_entries = [v for v in data_dict.values() if "png_path" in v and os.path.exists(v["png_path"])]

        if not png_entries:
            return []

        # Sort by dimensions_m (proxy for area)
        sorted_entries = sorted(png_entries, key=lambda x: x.get("dimensions_m", 0))
        dimensions = [e.get("dimensions_m", 0) for e in sorted_entries]

        # Find closest dimension
        target_dim = np.sqrt(area_m2)
        idx = min(range(len(dimensions)), key=lambda i: abs(dimensions[i] - target_dim))

        # Get window around idx
        start = max(0, idx - window)
        end = min(len(sorted_entries), idx + window + 1)
        return sorted_entries[start:end]

    def read_png_bytes(self, ref_data: Dict) -> bytes:
        """Read PNG file as bytes."""
        png_path = ref_data.get("png_path")
        if not png_path or not os.path.exists(png_path):
            return b""
        with open(png_path, "rb") as f:
            return f.read()

    def get_reference_levels(self, ref_data: Dict) -> List[int]:
        """Extract levels list from reference metadata."""
        import ast

        levels_str = ref_data.get("levels", "[]")
        try:
            # Try parsing as Python list string
            if isinstance(levels_str, str):
                return ast.literal_eval(levels_str)
            else:
                return levels_str if isinstance(levels_str, list) else []
        except Exception:
            return []
