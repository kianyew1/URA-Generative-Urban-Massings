"""
Color-based map extraction utilities
Adapted from parcel_gens.py extract_maps function
"""
import numpy as np
import cv2
from scipy import ndimage
from skimage import morphology


def extract_maps(image_array, min_area_ratio=0.0001):
    """
    Extract different map layers from a color-coded urban plan image.
    
    Color coding:
    - Red (R>100, G<100, B<100): Residential parcels
    - Yellow (R>210, G>210, B<210): Commercial parcels
    - Blue (B>150, R<150, G<150): Water bodies
    - Green (G>110, R<110, B<110): Green spaces
    - Gray (RGB≈160±85): Roads
    
    Args:
        image_array: RGB image as numpy array (H x W x 3)
        min_area_ratio: Minimum area ratio for removing small objects
        
    Returns:
        Tuple of binary masks (residential, commercial, water, green, roads)
    """
    if isinstance(image_array, str):
        # If path provided, load it
        image_array = cv2.imread(image_array)
        image_array = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
    
    height, width = image_array.shape[:2]
    r = image_array[:, :, 0]
    g = image_array[:, :, 1]
    b = image_array[:, :, 2]
    
    # Extract residential (red)
    residential_map = np.where(
        (r > 100) & (g < 100) & (b < 100),
        1, 0
    ).astype(np.uint8)
    
    # Extract commercial (yellow)
    commercial_map = np.where(
        (r > 210) & (g > 210) & (b < 210),
        1, 0
    ).astype(np.uint8)
    
    # Extract water (blue)
    water_map = np.where(
        (b > 150) & (r < 150) & (g < 150),
        1, 0
    ).astype(np.uint8)
    
    # Extract green spaces (green)
    green_map = np.where(
        (g > 110) & (r < 110) & (b < 110),
        1, 0
    ).astype(np.uint8)
    
    # Extract roads (gray)
    roads_map = np.where(
        (np.abs(r - 160) < 85) & 
        (np.abs(g - 160) < 85) & 
        (np.abs(b - 160) < 85),
        1, 0
    ).astype(np.uint8)
    
    # Clean up maps by removing small objects
    min_area_pixels = int(min_area_ratio * height * width)
    
    residential_map = morphology.remove_small_objects(
        residential_map.astype(bool), 
        min_size=min_area_pixels
    ).astype(np.uint8)
    
    commercial_map = morphology.remove_small_objects(
        commercial_map.astype(bool), 
        min_size=min_area_pixels
    ).astype(np.uint8)
    
    water_map = morphology.remove_small_objects(
        water_map.astype(bool), 
        min_size=min_area_pixels
    ).astype(np.uint8)
    
    green_map = morphology.remove_small_objects(
        green_map.astype(bool), 
        min_size=min_area_pixels
    ).astype(np.uint8)
    
    roads_map = morphology.remove_small_objects(
        roads_map.astype(bool), 
        min_size=min_area_pixels
    ).astype(np.uint8)
    
    return residential_map, commercial_map, water_map, green_map, roads_map
