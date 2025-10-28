import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerControl } from "./LayerControl";
import { LayerManager } from "./LayerManager";
import {
  GEOJSON_DATA,
  THIRD_GENERATION,
  CLAUDE_GENERATION,
  HUBERT_GENERATION,
} from "./consts/const";
import {
  DrawPolygonMode,
  DrawRectangleMode,
  ViewMode,
} from "@deck.gl-community/editable-layers";
import { BASEMAPS } from "./consts/const";

// Initial camera position - Sembawang waterfront area, Singapore
const INITIAL_VIEW_STATE = {
  longitude: 103.8198,
  latitude: 1.4554,
  zoom: 15,
  pitch: 0,
  bearing: 0,
};

// Main Map Component
export default function DeckGlMap() {
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
  const [masterPlanData, setMasterPlanData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [currentBasemap, setCurrentBasemap] =
    useState<keyof typeof BASEMAPS>("positron");
  const [basemapSelectorOpen, setBasemapSelectorOpen] = useState(false);

  // layers
  const [layerManager] = useState(() => {
    const manager = new LayerManager();

    manager.addLayer({
      id: "generation-three",
      name: "Generation Three",
      visible: true,
      type: "geojson",
    });

    manager.addLayer({
      id: "hubert-generation",
      name: "Hubert Generation",
      visible: true,
      type: "geojson",
    });

    // Add Master Plan layer
    manager.addLayer({
      id: "master-plan",
      name: "URA Master Plan 2019",
      visible: false,
      type: "geojson",
    });
    return manager;
  });

  const [layerRevision, setLayerRevision] = useState(0);

  // screenshot functionality consts
  const deckRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  const captureScreenshot = useCallback(
    async (layerId: string) => {
      const layer = layerManager.getLayer(layerId);
      if (!layer?.bounds || !deckRef.current) {
        console.error(
          "Cannot capture screenshot: missing bounds or deck reference"
        );
        return;
      }

      const deck = deckRef.current.deck;
      if (!deck) {
        console.error("Deck instance not available");
        return;
      }

      const { minLng, maxLng, minLat, maxLat } = layer.bounds;

      // Temporarily hide the bounding box layer for screenshot
      const originalVisibility = layer.visible;
      layerManager.toggleLayer(layerId);
      setLayerRevision((prev) => prev + 1);

      // Wait for deck to re-render with layer hidden
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Force a redraw to ensure the layer is hidden
      deck.redraw(true);

      // Wait a bit more for the redraw to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const padding = 0; // pixels of padding around bbox
        const scale = 5; // Higher resolution multiplier (2x or 3x for better quality)

        // Get the viewport
        const viewport = deck.getViewports()[0];

        // Project the bounds to get pixel coordinates
        const nw = viewport.project([minLng, maxLat]);
        const se = viewport.project([maxLng, minLat]);
        const ne = viewport.project([maxLng, maxLat]);
        const sw = viewport.project([minLng, minLat]);

        // Calculate dimensions - use min/max to handle all orientations
        const minX = Math.min(nw[0], se[0], ne[0], sw[0]);
        const maxX = Math.max(nw[0], se[0], ne[0], sw[0]);
        const minY = Math.min(nw[1], se[1], ne[1], sw[1]);
        const maxY = Math.max(nw[1], se[1], ne[1], sw[1]);

        const width = maxX - minX;
        const height = maxY - minY;

        console.log("Crop area:", {
          minX,
          minY,
          width,
          height,
          padding,
          scale,
        });

        // Get the canvas
        const canvas = deck.canvas;

        // Create a high-resolution cropped canvas
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = (width + padding * 2) * scale;
        cropCanvas.height = (height + padding * 2) * scale;
        const ctx = cropCanvas.getContext("2d", {
          willReadFrequently: false,
          alpha: false,
        });

        if (ctx && canvas) {
          // Scale the context for high resolution
          ctx.scale(scale, scale);

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Fill with white background first
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width + padding * 2, height + padding * 2);

          // Draw the cropped area
          ctx.drawImage(
            canvas,
            minX - padding,
            minY - padding,
            width + padding * 2,
            height + padding * 2,
            0,
            0,
            width + padding * 2,
            height + padding * 2
          );

          // Download the image
          cropCanvas.toBlob(
            (blob) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.download = `${
                layer.name
              }-screenshot-${new Date().getTime()}.png`;
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);
            },
            "image/png",
            1.0
          );

          // Store the coordinates
          const bboxData = {
            layerId,
            coordinates: {
              topLeft: [minLng, maxLat],
              topRight: [maxLng, maxLat],
              bottomRight: [maxLng, minLat],
              bottomLeft: [minLng, minLat],
            },
            bounds: layer.bounds,
            timestamp: new Date().toISOString(),
          };

          console.log("Captured bounding box data:", bboxData);
          localStorage.setItem(`bbox-${layerId}`, JSON.stringify(bboxData));
        }
      } finally {
        // Restore layer visibility
        if (originalVisibility !== layer.visible) {
          layerManager.toggleLayer(layerId);
          setLayerRevision((prev) => prev + 1);
        }
      }
    },
    [layerManager]
  );
  // function to parse HTML description from URA masterplan .geojson
  const parseDescription = useCallback((description: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(description, "text/html");
    const rows = doc.querySelectorAll("tr");
    const properties: Record<string, string> = {};

    rows.forEach((row) => {
      const cells = row.querySelectorAll("th, td");
      if (cells.length === 2) {
        const key = cells[0].textContent?.trim();
        const value = cells[1].textContent?.trim();
        if (key && value) {
          properties[key] = value;
        }
      }
    });

    return properties;
  }, []);

  const [features, setFeatures] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [mode, setMode] = useState(() => new ViewMode());
  const [selectedFeatureIndexes] = useState([]);

  // Load Master Plan data with streaming
  useEffect(() => {
    let isCancelled = false;

    const loadMasterPlan = async () => {
      try {
        setIsLoading(true);

        const url =
          process.env.NODE_ENV === "production"
            ? "https://pub-11f00423b1754a1fac8d8ed39c0f472c.r2.dev/MasterPlan2019LandUselayer.geojson"
            : "/MasterPlan2019LandUselayer.geojson";

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!isCancelled) {
          setMasterPlanData(data);
          console.log(
            `Loaded ${data.features?.length || 0} Master Plan features`
          );
        }
      } catch (error) {
        console.error("Error loading Master Plan:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMasterPlan();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleEdit = useCallback(
    ({ updatedData, editType }: any) => {
      setFeatures(updatedData);

      if (editType === "addFeature" && updatedData.features.length > 0) {
        const newFeature =
          updatedData.features[updatedData.features.length - 1];

        const isRectangle = mode instanceof DrawRectangleMode;
        const layerId = `drawn-${
          isRectangle ? "bbox" : "polygon"
        }-${Date.now()}`;

        const coordinates = newFeature.geometry.coordinates[0];
        const lngs = coordinates.map((coord: number[]) => coord[0]);
        const lats = coordinates.map((coord: number[]) => coord[1]);
        const bounds = {
          minLng: Math.min(...lngs),
          maxLng: Math.max(...lngs),
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
        };

        layerManager.addLayer({
          id: layerId,
          name: isRectangle
            ? `Bounding Box ${
                layerManager
                  .getAllLayers()
                  .filter((l) => l.type === "drawn" && l.id.includes("bbox"))
                  .length + 1
              }`
            : `Polygon ${
                layerManager
                  .getAllLayers()
                  .filter((l) => l.type === "drawn" && l.id.includes("polygon"))
                  .length + 1
              }`,
          visible: true,
          type: "drawn",
          data: {
            type: "FeatureCollection",
            features: [newFeature],
          },
          geometry: newFeature.geometry,
          bounds: isRectangle ? bounds : undefined,
        });

        setFeatures({
          type: "FeatureCollection",
          features: [],
        });

        setMode(new ViewMode());
        setLayerRevision((prev) => prev + 1);
      }
    },
    [layerManager, mode]
  );

  const handleGeoJsonImport = useCallback(
    (geojson: any, name: string) => {
      console.log("Importing GeoJSON:", geojson);
      const layerId = `imported-${Date.now()}`;

      const data =
        geojson.type === "FeatureCollection"
          ? geojson
          : {
              type: "FeatureCollection",
              features:
                geojson.type === "Feature"
                  ? [geojson]
                  : [
                      {
                        type: "Feature",
                        geometry: geojson,
                        properties: {},
                      },
                    ],
            };

      console.log("Processed data:", data);

      layerManager.addLayer({
        id: layerId,
        name: name,
        visible: true,
        type: "imported",
        data: data,
      });

      console.log("All layers:", layerManager.getAllLayers());
      setLayerRevision((prev) => prev + 1);
    },
    [layerManager]
  );

  const handleLayerToggle = useCallback(
    (id: string) => {
      layerManager.toggleLayer(id);
      setLayerRevision((prev) => prev + 1);
    },
    [layerManager]
  );

  const handleLayerRemove = useCallback(
    (id: string) => {
      layerManager.removeLayer(id);
      setLayerRevision((prev) => prev + 1);
    },
    [layerManager]
  );

  const layers = useMemo(
    () =>
      layerManager.createDeckLayers(
        {
          "generation-three": THIRD_GENERATION,
          "master-plan": masterPlanData,
          "hubert-generation": HUBERT_GENERATION,
        },
        features,
        selectedFeatureIndexes,
        handleEdit,
        mode
      ),
    [
      layerManager,
      features,
      masterPlanData,
      selectedFeatureIndexes,
      handleEdit,
      mode,
      layerRevision,
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

            {/* Other layers (Claude Generation, etc) */}
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
      />

      {/* Basemap Selector */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="relative">
          <button
            className="bg-white text-gray-700 px-4 py-2 rounded shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={() => setBasemapSelectorOpen(!basemapSelectorOpen)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            {BASEMAPS[currentBasemap].name}
          </button>

          {basemapSelectorOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded shadow-lg overflow-hidden min-w-[200px]">
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

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
        <button
          className={`px-4 py-2 rounded shadow-lg ${
            mode instanceof DrawPolygonMode
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700"
          }`}
          onClick={() => {
            setMode((prevMode) =>
              prevMode instanceof DrawPolygonMode
                ? new ViewMode()
                : new DrawPolygonMode()
            );
          }}
        >
          {mode instanceof DrawPolygonMode ? "Stop Drawing" : "Draw Polygon"}
        </button>
        <button
          className={`px-4 py-2 rounded shadow-lg ${
            mode instanceof DrawRectangleMode
              ? "bg-green-500 text-white"
              : "bg-white text-gray-700"
          }`}
          onClick={() => {
            setMode((prevMode) =>
              prevMode instanceof DrawRectangleMode
                ? new ViewMode()
                : new DrawRectangleMode()
            );
          }}
        >
          {mode instanceof DrawRectangleMode
            ? "Stop Drawing"
            : "Draw Bounding Box"}
        </button>
      </div>

      <DeckGL
        ref={deckRef}
        initialViewState={INITIAL_VIEW_STATE}
        controller={{
          doubleClickZoom: false,
        }}
        layers={layers}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        getCursor={({ isDragging }) => (isDragging ? "grabbing" : "grab")}
        onHover={(info) => setHoverInfo(info)}
      >
        <Map
          ref={mapRef}
          {...viewState}
          style={{ width: "100%", height: "100%" }}
          mapStyle={BASEMAPS[currentBasemap].url}
          mapLib={import("maplibre-gl")}
        />
      </DeckGL>
    </div>
  );
}
