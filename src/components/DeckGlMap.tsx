import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { DrawPolygonMode, ViewMode } from "@deck.gl-community/editable-layers";
import { BASEMAPS } from "./consts/const";

// Initial camera position - Sembawang waterfront area, Singapore
const INITIAL_VIEW_STATE = {
  longitude: 103.8198,
  latitude: 1.4554,
  zoom: 15,
  pitch: 45,
  bearing: -20,
};

// Main Map Component
export default function DeckGlMap() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [masterPlanData, setMasterPlanData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [currentBasemap, setCurrentBasemap] =
    useState<keyof typeof BASEMAPS>("positron");
  const [basemapSelectorOpen, setBasemapSelectorOpen] = useState(false);

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

  const [layerManager] = useState(() => {
    const manager = new LayerManager();
    manager.addLayer({
      id: "urban-massing",
      name: "Urban Massing",
      visible: true,
      type: "geojson",
    });

    manager.addLayer({
      id: "generation-three",
      name: "Generation Three",
      visible: true,
      type: "geojson",
    });

    manager.addLayer({
      id: "claude-generation",
      name: "Claude Generation",
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
      visible: false, // Start hidden due to size
      type: "geojson",
    });
    return manager;
  });

  const [layerRevision, setLayerRevision] = useState(0);

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

        // Fetch with streaming to handle large file
        const response = await fetch("/MasterPlan2019LandUselayer.geojson");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse JSON in chunks if possible, or as a whole
        const data = await response.json();

        if (!isCancelled) {
          setMasterPlanData(data);
          console.log(`Loaded ${data.features.length} Master Plan features`);
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

      // When a feature is added (polygon completed), save it as a new layer
      if (editType === "addFeature" && updatedData.features.length > 0) {
        const newFeature =
          updatedData.features[updatedData.features.length - 1];
        const layerId = `drawn-polygon-${Date.now()}`;

        layerManager.addLayer({
          id: layerId,
          name: `Polygon ${
            layerManager.getAllLayers().filter((l) => l.type === "drawn")
              .length + 1
          }`,
          visible: true,
          type: "drawn",
          data: {
            type: "FeatureCollection",
            features: [newFeature],
          },
          geometry: newFeature.geometry, // Add the geometry
        });

        // Clear the drawing layer
        setFeatures({
          type: "FeatureCollection",
          features: [],
        });

        // Exit drawing mode
        setMode(new ViewMode());

        // Trigger re-render
        setLayerRevision((prev) => prev + 1);
      }
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
          "urban-massing": GEOJSON_DATA,
          "generation-three": THIRD_GENERATION,
          "claude-generation": CLAUDE_GENERATION,
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

  // const isDrawing = mode === DrawPolygonMode;

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

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
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
      </div>

      <DeckGL
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
          {...viewState}
          style={{ width: "100%", height: "100%" }}
          mapStyle={BASEMAPS[currentBasemap].url}
          mapLib={import("maplibre-gl")}
        />
      </DeckGL>
    </div>
  );
}
