import React, { useState, useMemo, useEffect, useRef } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerControl } from "./LayerControl";
import { LayerManager } from "./LayerManager";
import {
  DrawRectangleMode,
  ViewMode,
  DrawSquareMode,
} from "@deck.gl-community/editable-layers";
import { BASEMAPS } from "./consts/const";
import "@deck.gl/widgets/stylesheet.css";
import { parseDescription } from "./functions/functions";
import { useScreenshot } from "./functions/useScreenshot";
import { useLayerOperations } from "./functions/useLayerOperations";
import { Box, Square, RotateCcw, Map as MapIcon } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [currentBasemap, setCurrentBasemap] =
    useState<keyof typeof BASEMAPS>("voyager");
  const [basemapSelectorOpen, setBasemapSelectorOpen] = useState(false);
  const [boundingBox, setBoundingBox] = useState<any>(null);

  // layers
  const [layerManager] = useState(() => {
    const manager = new LayerManager();

    // Add background water layer FIRST (covers entire area)
    manager.addLayer({
      id: "water-background",
      name: "Water Background",
      visible: true,
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
          setMasterPlanData(masterPlanData);
          setBuildingOutlineData(buildingOutlineData);
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

  // Use the layer operations hook
  const {
    handleEdit,
    handleGeoJsonImport,
    handleLayerToggle,
    handleLayerRemove,
  } = useLayerOperations({
    layerManager,
    setLayerRevision,
    setFeatures,
    setMode,
    mode,
    setBoundingBox,
  });

  const layers = useMemo(
    () =>
      layerManager.createDeckLayers(
        {
          "water-background": WATER_BACKGROUND,
          "master-plan": masterPlanData,
          "building-outline": buildingOutlineData,
          parcels: parcelsData,
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
      buildingOutlineData,
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
        className="absolute bottom-4 left-1/2 z-10"
        style={{ transform: "translate(calc(-50% + 4rem), 0)" }}
      >
        <div className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-sm">
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
