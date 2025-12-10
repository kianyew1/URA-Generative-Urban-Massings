import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerControl } from "./LayerControl";
import { LayerManager } from "./LayerManager";
import * as turf from "@turf/turf";
import {
  DrawRectangleMode,
  ViewMode,
  DrawSquareMode,
  ModifyMode,
} from "@deck.gl-community/editable-layers";
import { BASEMAPS } from "./consts/const";
import "@deck.gl/widgets/stylesheet.css";
import { parseDescription } from "./functions/functions";
import { useScreenshot } from "./functions/useScreenshot";
import { useLayerOperations } from "./functions/useLayerOperations";
import {
  Box,
  Square,
  RotateCcw,
  Map as MapIcon,
  GripVertical,
  Move,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import { BERLARYAR_CREEK_PARCELWISE_GENERATION } from "./consts/const";

// Initial camera position - Sembawang waterfront area, Singapore
const INITIAL_VIEW_STATE = {
  longitude: 103.8198,
  latitude: 1.4554,
  zoom: 15,
  pitch: 0,
  bearing: 0,
};

// Create a large blue water background covering Singapore area
const WATER_BACKGROUND = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.6, 1.2], // Southwest corner
            [104.1, 1.2], // Southeast corner
            [104.1, 1.5], // Northeast corner
            [103.6, 1.5], // Northwest corner
            [103.6, 1.2], // Close the polygon
          ],
        ],
      },
    },
  ],
};

// Main Map Component
export default function DeckGlMap() {
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
  const [masterPlanData, setMasterPlanData] = useState<any>(null);
  const [waterData, setWaterData] = useState<any>(null);
  const [buildingOutlineData, setBuildingOutlineData] = useState(null);
  const [parcelsData, setParcelsData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Caching for optimized master plan data
  const masterPlanCacheRef = useRef<{
    zoom: number;
    bounds: any;
    data: any;
    fullData: any;
  } | null>(null);

  // Debounced viewport for optimization
  const [debouncedViewport, setDebouncedViewport] = useState({
    longitude: viewState.longitude,
    latitude: viewState.latitude,
    zoom: viewState.zoom,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [currentBasemap, setCurrentBasemap] =
    useState<keyof typeof BASEMAPS>("voyager");
  const [basemapSelectorOpen, setBasemapSelectorOpen] = useState(false);
  const [boundingBox, setBoundingBox] = useState<any>(null);
  const [toolbarPosition, setToolbarPosition] = useState(0); // Position offset from center
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Building editing state
  const [buildingEditMode, setBuildingEditMode] = useState<
    "view" | "move" | "extrude"
  >("view");
  const [buildingEditData, setBuildingEditData] = useState<any>(null);
  const [buildingMode, setBuildingMode] = useState<any>(new ViewMode());
  const [selectedBuildingIndexes, setSelectedBuildingIndexes] = useState<
    number[]
  >([]);
  const [selectedBuildingHeight, setSelectedBuildingHeight] =
    useState<number>(0);
  const [activeEditLayerId, setActiveEditLayerId] = useState<
    string | undefined
  >(undefined);

  // layers
  const [layerManager] = useState(() => {
    const manager = new LayerManager();

    // Add background water layer FIRST (covers entire area)
    manager.addLayer({
      id: "water-background",
      name: "Water Background",
      visible: false,
      type: "geojson",
      category: "system",
    });

    // Add Master Plan layer
    manager.addLayer({
      id: "master-plan",
      name: "URA Master Plan 2019",
      visible: false,
      type: "geojson",
      category: "system",
    });

    // Add Building Outline layer
    manager.addLayer({
      id: "building-outline",
      name: "SG Building Outlines",
      visible: false,
      type: "geojson",
      category: "system",
    });

    // Add Parcels layer
    manager.addLayer({
      id: "parcels",
      name: "Land Parcels",
      visible: false,
      type: "geojson",
      category: "system",
    });

    // Add Berlaryar Creek Parcelwise
    manager.addLayer({
      id: "berlaryar-creek",
      name: "Berlaryar Creek Parcelwise Generation",
      visible: false,
      type: "geojson",
      category: "system",
    });

    // Add Berlaryar Road Network bitmap layer
    manager.addLayer({
      id: "berlaryar-road-network",
      name: "Berlaryar Road Network",
      visible: false,
      type: "bitmap",
      category: "system",
      image: "/berlaryar_road_network.png",
      bounds: [
        103.80118661426008, 1.262192916646191, 103.81360486018805,
        1.2727073042235681,
      ],
      opacity: 0.8,
    });
    return manager;
  });

  const [layerRevision, setLayerRevision] = useState(0);

  // Add this state after the existing refs
  const deckRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  // Use the screenshot hook
  const { screenshotWidget, captureScreenshot } = useScreenshot({
    layerManager,
    deckRef,
    mapRef,
    setLayerRevision,
  });

  const [features, setFeatures] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [mode, setMode] = useState(() => new ViewMode());
  const [selectedFeatureIndexes] = useState([]);

  // Load GeoJSON data
  useEffect(() => {
    let isCancelled = false;

    const loadGeoJsonData = async () => {
      try {
        setIsLoading(true);

        // Load Master Plan
        const masterPlanUrl =
          process.env.NODE_ENV === "production"
            ? "https://pub-11f00423b1754a1fac8d8ed39c0f472c.r2.dev/MasterPlan2019LandUselayer.geojson"
            : "/MasterPlan2019LandUselayer.geojson";

        const masterPlanResponse = await fetch(masterPlanUrl);
        if (!masterPlanResponse.ok) {
          throw new Error(`HTTP error! status: ${masterPlanResponse.status}`);
        }
        const masterPlanData = await masterPlanResponse.json();

        // Load Building Outlines
        const buildingOutlineUrl =
          process.env.NODE_ENV === "production"
            ? "https://pub-11f00423b1754a1fac8d8ed39c0f472c.r2.dev/buildings_with_height.geojson"
            : "/buildings_with_height.geojson";

        const buildingOutlineResponse = await fetch(buildingOutlineUrl);
        if (!buildingOutlineResponse.ok) {
          throw new Error(
            `HTTP error! status: ${buildingOutlineResponse.status}`
          );
        }
        const buildingOutlineData = await buildingOutlineResponse.json();

        // Load Parcels
        const parcelsUrl =
          process.env.NODE_ENV === "production"
            ? "https://pub-11f00423b1754a1fac8d8ed39c0f472c.r2.dev/parcels.geojson"
            : "/parcels.geojson";

        const parcelsResponse = await fetch(parcelsUrl);
        if (!parcelsResponse.ok) {
          throw new Error(`HTTP error! status: ${parcelsResponse.status}`);
        }
        const parcelsData = await parcelsResponse.json();

        if (!isCancelled) {
          // Store full data in cache for viewport filtering
          masterPlanCacheRef.current = {
            zoom: viewState.zoom,
            bounds: null,
            data: null,
            fullData: masterPlanData,
          };

          setMasterPlanData(masterPlanData);
          setBuildingOutlineData(buildingOutlineData);
          setBuildingEditData(buildingOutlineData); // Initialize edit data
          setParcelsData(parcelsData);
          console.log(
            `Loaded ${
              masterPlanData.features?.length || 0
            } Master Plan features`
          );
          console.log(
            `Loaded ${
              buildingOutlineData.features?.length || 0
            } Building Outline features`
          );

          // Filter out water features for the water layer
          if (masterPlanData.features) {
            const waterFeatures = masterPlanData.features.filter(
              (feature: any) => {
                const desc = feature.properties?.Description || "";
                const luDesc = feature.properties?.LU_DESC || "";
                // Check if it's a water body
                return (
                  desc.includes("WATERBODY") ||
                  luDesc.includes("WATERBODY") ||
                  desc.includes("WATER") ||
                  luDesc.includes("WATER") ||
                  luDesc === "WATERBODY"
                );
              }
            );

            setWaterData({
              type: "FeatureCollection",
              features: waterFeatures,
            });

            console.log(
              `Loaded ${parcelsData.features?.length || 0} Parcel features, ${
                waterFeatures.length
              } water features`
            );
          }
        }
      } catch (error) {
        console.error("Error loading GeoJSON data:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadGeoJsonData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Debounce viewport updates to reduce re-renders
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedViewport({
        longitude: viewState.longitude,
        latitude: viewState.latitude,
        zoom: viewState.zoom,
      });
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [viewState.longitude, viewState.latitude, viewState.zoom]);

  // Optimize master plan data based on viewport and zoom
  const optimizedMasterPlanData = useMemo(() => {
    if (
      !masterPlanCacheRef.current?.fullData ||
      !layerManager.getLayer("master-plan")?.visible
    ) {
      return null;
    }

    const zoom = debouncedViewport.zoom;
    const fullData = masterPlanCacheRef.current.fullData;

    // At lower zoom levels, don't render at all - too many features
    if (zoom < 12) {
      console.log(
        `Master Plan: Disabled at zoom ${zoom.toFixed(1)} (zoom in to see data)`
      );
      return {
        type: "FeatureCollection",
        features: [],
      };
    }

    // Calculate viewport bounds properly
    // At zoom level z, the world is 2^z tiles wide
    // Each tile is 256 pixels, and the world spans 360 degrees of longitude
    const WORLD_SIZE = 512; // Width of the world in pixels at zoom 0
    const scale = WORLD_SIZE * Math.pow(2, zoom);

    // Get viewport size (assume typical screen dimensions, adjust with padding)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate degrees per pixel
    const degreesPerPixelLng = 360 / scale;
    const degreesPerPixelLat =
      360 / scale / Math.cos((debouncedViewport.latitude * Math.PI) / 180);

    // Calculate bounds with generous padding
    const paddingPixels = 500; // Add 500 pixels of padding on all sides
    const lngExtent = (viewportWidth / 2 + paddingPixels) * degreesPerPixelLng;
    const latExtent = (viewportHeight / 2 + paddingPixels) * degreesPerPixelLat;

    const viewport = {
      minLng: debouncedViewport.longitude - lngExtent,
      maxLng: debouncedViewport.longitude + lngExtent,
      minLat: debouncedViewport.latitude - latExtent,
      maxLat: debouncedViewport.latitude + latExtent,
    };

    console.log(
      `Viewport bounds: lng [${viewport.minLng.toFixed(
        4
      )}, ${viewport.maxLng.toFixed(4)}], lat [${viewport.minLat.toFixed(
        4
      )}, ${viewport.maxLat.toFixed(4)}]`
    );

    try {
      // Filter features by viewport bounds - only render what's visible
      const visibleFeatures = fullData.features.filter((feature: any) => {
        if (!feature.geometry) return false;

        try {
          const bbox = turf.bbox(feature);
          const [minLng, minLat, maxLng, maxLat] = bbox;

          // Check if feature intersects viewport
          return !(
            maxLng < viewport.minLng ||
            minLng > viewport.maxLng ||
            maxLat < viewport.minLat ||
            minLat > viewport.maxLat
          );
        } catch (e) {
          return false; // Skip features that fail bbox calculation
        }
      });

      // More generous feature limits based on zoom level
      const maxFeatures =
        zoom < 13 ? 3000 : zoom < 14 ? 7500 : zoom < 15 ? 15000 : 30000;
      const cappedFeatures = visibleFeatures.slice(0, maxFeatures);

      console.log(
        `Master Plan: ${fullData.features.length} → ${
          visibleFeatures.length
        } in viewport → ${cappedFeatures.length} rendered (zoom: ${zoom.toFixed(
          1
        )}, cap: ${maxFeatures})`
      );

      return {
        type: "FeatureCollection",
        features: cappedFeatures,
      };
    } catch (error) {
      console.error("Error optimizing master plan data:", error);
      return {
        type: "FeatureCollection",
        features: [],
      };
    }
  }, [
    debouncedViewport.zoom,
    debouncedViewport.longitude,
    debouncedViewport.latitude,
    layerRevision,
  ]);

  // Use the layer operations hook
  const {
    handleEdit,
    handleGeoJsonImport,
    handleLayerToggle,
    handleLayerRemove,
    handleBuildingEdit,
    handleBuildingSelect,
    handleBuildingHeightChange,
    handleBuildingDelete,
    toggleBuildingEditMode,
  } = useLayerOperations({
    layerManager,
    setLayerRevision,
    setFeatures,
    setMode,
    mode,
    setBoundingBox,
    setBuildingEditData,
    setBuildingMode,
    setSelectedBuildingIndexes,
    buildingEditData,
    activeEditLayerId,
  });

  // Toolbar drag handlers
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    setIsDraggingToolbar(true);
    setDragStart(e.clientX - toolbarPosition);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingToolbar && toolbarRef.current) {
        const newPosition = e.clientX - dragStart;
        const windowWidth = window.innerWidth;
        const toolbarWidth = toolbarRef.current.offsetWidth;

        // Calculate constraints to keep toolbar within viewport
        const maxOffset = (windowWidth - toolbarWidth) / 2;
        const minOffset = -(windowWidth - toolbarWidth) / 2;

        // Clamp the position
        const clampedPosition = Math.max(
          minOffset,
          Math.min(maxOffset, newPosition)
        );
        setToolbarPosition(clampedPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    if (isDraggingToolbar) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingToolbar, dragStart, toolbarPosition]);

  const layers = useMemo(
    () =>
      layerManager.createDeckLayers(
        {
          "water-background": WATER_BACKGROUND,
          "master-plan": optimizedMasterPlanData || masterPlanData,
          "building-outline": buildingOutlineData,
          parcels: parcelsData,
          "berlaryar-creek": BERLARYAR_CREEK_PARCELWISE_GENERATION,
          "berlaryar-road-network": null, // Bitmap layer uses image from layer config
        },
        features,
        selectedFeatureIndexes,
        handleEdit,
        mode,
        buildingEditData,
        selectedBuildingIndexes,
        handleBuildingEdit,
        buildingMode
      ),
    [
      layerManager,
      features,
      optimizedMasterPlanData,
      masterPlanData,
      buildingOutlineData,
      selectedFeatureIndexes,
      handleEdit,
      mode,
      layerRevision,
      buildingEditData,
      selectedBuildingIndexes,
      handleBuildingEdit,
      buildingMode,
    ]
  );

  return (
    <div className="relative w-full h-screen">
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white px-6 py-4 rounded shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">Loading Master Plan data...</span>
          </div>
        </div>
      )}

      {/* Tooltip for hover information */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="absolute z-50 pointer-events-none bg-white px-4 py-3 rounded-lg shadow-lg max-w-xs border border-gray-200"
          style={{
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
          }}
        >
          <div className="text-sm">
            {/* Master Plan Layer - parse HTML description */}
            {hoverInfo.object.properties?.Description &&
              (() => {
                const parsed = parseDescription(
                  hoverInfo.object.properties.Description
                );
                return (
                  <>
                    {parsed.LU_DESC && (
                      <div className="font-bold text-gray-900 mb-2 text-base">
                        {parsed.LU_DESC}
                      </div>
                    )}
                    {parsed.GPR && parsed.GPR !== "EVA" && (
                      <div className="text-gray-600 mb-1">
                        <span className="font-semibold">GPR:</span> {parsed.GPR}
                      </div>
                    )}
                    {parsed.LU_TEXT && (
                      <div className="text-gray-600 mb-1">
                        <span className="font-semibold">Land Use:</span>{" "}
                        {parsed.LU_TEXT}
                      </div>
                    )}
                  </>
                );
              })()}

            {/* Direct properties from LU_DESC (if available) */}
            {hoverInfo.object.properties?.LU_DESC &&
              !hoverInfo.object.properties?.Description && (
                <>
                  <div className="font-bold text-gray-900 mb-2 text-base">
                    {hoverInfo.object.properties.LU_DESC}
                  </div>
                  {hoverInfo.object.properties.GPR && (
                    <div className="text-gray-600 mb-1">
                      <span className="font-semibold">GPR:</span>{" "}
                      {hoverInfo.object.properties.GPR}
                    </div>
                  )}
                  {hoverInfo.object.properties.REGION_N && (
                    <div className="text-gray-600 mb-1">
                      <span className="font-semibold">Region:</span>{" "}
                      {hoverInfo.object.properties.REGION_N}
                    </div>
                  )}
                  {hoverInfo.object.properties.PLN_AREA_N && (
                    <div className="text-gray-600 mb-1">
                      <span className="font-semibold">Planning Area:</span>{" "}
                      {hoverInfo.object.properties.PLN_AREA_N}
                    </div>
                  )}
                </>
              )}

            {/* Other layers */}
            {hoverInfo.object.properties?.type &&
              !hoverInfo.object.properties?.Description && (
                <>
                  <div className="font-bold text-gray-900 mb-1">
                    {hoverInfo.object.properties.type}
                  </div>
                  {hoverInfo.object.properties.height && (
                    <div className="text-gray-600">
                      <span className="font-semibold">Height:</span>{" "}
                      {hoverInfo.object.properties.height}m
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      )}

      <LayerControl
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        layers={layerManager.getAllLayers()}
        onLayerToggle={handleLayerToggle}
        onLayerRemove={handleLayerRemove}
        onGeoJsonImport={handleGeoJsonImport}
        onCaptureScreenshot={captureScreenshot}
        boundingBox={boundingBox}
        manager={layerManager}
      />

      {/* Fixed Bottom Toolbar */}
      <div
        ref={toolbarRef}
        className="absolute bottom-4 left-1/2 z-10"
        style={{
          transform: `translate(calc(-50% + ${toolbarPosition}px), 0)`,
          cursor: isDraggingToolbar ? "grabbing" : "auto",
        }}
      >
        <div className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-sm">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing px-1 py-1 hover:bg-gray-100 rounded transition-colors"
            onMouseDown={handleToolbarMouseDown}
            title="Drag to reposition toolbar"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <button
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode instanceof DrawRectangleMode
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => {
              setMode((prevMode) =>
                prevMode instanceof DrawRectangleMode
                  ? new ViewMode()
                  : new DrawRectangleMode()
              );
            }}
          >
            <Box className="w-3.5 h-3.5" />
            {mode instanceof DrawRectangleMode
              ? "Stop Drawing"
              : "Draw Bounding Box"}
          </button>

          <button
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode instanceof DrawSquareMode
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => {
              setMode((prevMode) =>
                prevMode instanceof DrawSquareMode
                  ? new ViewMode()
                  : new DrawSquareMode()
              );
            }}
          >
            <Square className="w-3.5 h-3.5" />
            {mode instanceof DrawSquareMode ? "Stop Drawing" : "Draw Square"}
          </button>

          <button
            className="px-3 py-1.5 rounded flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
            onClick={() => {
              setViewState({
                ...viewState,
                pitch: 0,
                bearing: 0,
                transitionDuration: 500,
              });
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset View
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          {/* Building Edit Controls */}
          <button
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              buildingEditMode === "move"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => {
              if (buildingEditMode === "move") {
                // Save changes before stopping edit mode
                if (activeEditLayerId && buildingEditData) {
                  console.log("Saving changes for layer:", activeEditLayerId);
                  console.log("Updated data:", buildingEditData);

                  // If we were editing the building-outline layer, update its state
                  if (activeEditLayerId === "building-outline") {
                    setBuildingOutlineData(buildingEditData);
                    console.log("Updated buildingOutlineData state");
                  }
                  // For imported layers, the data is already in the layer manager
                }

                setBuildingEditMode("view");
                toggleBuildingEditMode(false);
                setActiveEditLayerId(undefined);
              } else {
                setBuildingEditMode("move");
                // Find the first visible layer that can be edited (building-outline or imported)
                const editableLayers = layerManager
                  .getAllLayers()
                  .filter(
                    (l) =>
                      l.visible &&
                      (l.id === "building-outline" || l.type === "imported")
                  );
                if (editableLayers.length > 0) {
                  const targetLayer = editableLayers[0];
                  setActiveEditLayerId(targetLayer.id);

                  // Set the building edit data to the target layer's data
                  const layerData =
                    targetLayer.id === "building-outline"
                      ? buildingOutlineData
                      : targetLayer.data;
                  setBuildingEditData(layerData);

                  toggleBuildingEditMode(true, targetLayer.id);
                  setSelectedBuildingIndexes([]);
                }
              }
            }}
          >
            <Move className="w-3.5 h-3.5" />
            {buildingEditMode === "move" ? "Stop Editing" : "Move Buildings"}
          </button>

          {/* Height adjustment control - show when building is selected */}
          {selectedBuildingIndexes.length > 0 &&
            buildingEditMode !== "view" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded">
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <input
                  type="number"
                  value={selectedBuildingHeight}
                  onChange={(e) => {
                    const newHeight = parseFloat(e.target.value) || 0;
                    setSelectedBuildingHeight(newHeight);
                    handleBuildingHeightChange(
                      selectedBuildingIndexes[0],
                      newHeight
                    );
                  }}
                  className="w-20 px-2 py-1 text-sm border rounded"
                  placeholder="Height"
                />
                <span className="text-xs text-gray-600">m</span>
                <button
                  className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1"
                  onClick={() => {
                    if (selectedBuildingIndexes.length > 0) {
                      handleBuildingDelete(selectedBuildingIndexes[0]);
                      setSelectedBuildingHeight(0);
                    }
                  }}
                  title="Delete selected building"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}

          <div className="h-6 w-px bg-gray-300 mx-1" />

          {/* Basemap Selector */}
          <div className="relative">
            <button
              className="px-3 py-1.5 rounded flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
              onClick={() => setBasemapSelectorOpen(!basemapSelectorOpen)}
            >
              <MapIcon className="w-3.5 h-3.5" />
              {BASEMAPS[currentBasemap].name}
            </button>

            {basemapSelectorOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg overflow-hidden min-w-[200px]">
                {Object.entries(BASEMAPS).map(([key, basemap]) => (
                  <button
                    key={key}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                      currentBasemap === key
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700"
                    }`}
                    onClick={() => {
                      setCurrentBasemap(key as keyof typeof BASEMAPS);
                      setBasemapSelectorOpen(false);
                    }}
                  >
                    {basemap.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DeckGL
        ref={deckRef}
        viewState={viewState}
        controller={{
          doubleClickZoom: false,
        }}
        layers={layers}
        widgets={[screenshotWidget]}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        getCursor={({ isDragging }) => (isDragging ? "grabbing" : "grab")}
        onHover={(info) => setHoverInfo(info)}
        onClick={(info) => {
          if (buildingEditMode !== "view" && info.object) {
            handleBuildingSelect(info);
            // Update height control with selected building's height
            const height =
              info.object.properties?.height ||
              info.object.properties?.elevation ||
              0;
            setSelectedBuildingHeight(height);
          }
        }}
      >
        <Map
          ref={mapRef}
          {...viewState}
          style={{ width: "100%", height: "100%" }}
          mapStyle={BASEMAPS[currentBasemap].url}
          mapLib={import("maplibre-gl")}
          preserveDrawingBuffer={true}
        />
      </DeckGL>
    </div>
  );
}
