import React, { useState, useMemo, useEffect, useRef } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerControl } from "./LayerControl";
import { LayerManager } from "./LayerManager";
import { THIRD_GENERATION, HUBERT_GENERATION } from "./consts/const";
import {
  DrawRectangleMode,
  ViewMode,
} from "@deck.gl-community/editable-layers";
import { BASEMAPS } from "./consts/const";
import "@deck.gl/widgets/stylesheet.css";
import { parseDescription } from "./functions/functions";
import { useScreenshot } from "./functions/useScreenshot";
import { useLayerOperations } from "./functions/useLayerOperations";

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
    });

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

          // Filter out water features for the water layer
          if (data.features) {
            const waterFeatures = data.features.filter((feature: any) => {
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
            });

            setWaterData({
              type: "FeatureCollection",
              features: waterFeatures,
            });

            console.log(
              `Loaded ${data.features?.length || 0} Master Plan features, ${
                waterFeatures.length
              } water features`
            );
          }
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
    <div className='relative w-full h-screen'>
      {isLoading && (
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white px-6 py-4 rounded shadow-lg'>
          <div className='flex items-center space-x-3'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
            <span className='text-gray-700'>Loading Master Plan data...</span>
          </div>
        </div>
      )}

      {/* Tooltip for hover information */}
      {hoverInfo && hoverInfo.object && (
        <div
          className='absolute z-50 pointer-events-none bg-white px-4 py-3 rounded-lg shadow-lg max-w-xs border border-gray-200'
          style={{
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
          }}
        >
          <div className='text-sm'>
            {/* Master Plan Layer - parse HTML description */}
            {hoverInfo.object.properties?.Description &&
              (() => {
                const parsed = parseDescription(
                  hoverInfo.object.properties.Description
                );
                return (
                  <>
                    {parsed.LU_DESC && (
                      <div className='font-bold text-gray-900 mb-2 text-base'>
                        {parsed.LU_DESC}
                      </div>
                    )}
                    {parsed.GPR && parsed.GPR !== "EVA" && (
                      <div className='text-gray-600 mb-1'>
                        <span className='font-semibold'>GPR:</span> {parsed.GPR}
                      </div>
                    )}
                    {parsed.LU_TEXT && (
                      <div className='text-gray-600 mb-1'>
                        <span className='font-semibold'>Land Use:</span>{" "}
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
                  <div className='font-bold text-gray-900 mb-2 text-base'>
                    {hoverInfo.object.properties.LU_DESC}
                  </div>
                  {hoverInfo.object.properties.GPR && (
                    <div className='text-gray-600 mb-1'>
                      <span className='font-semibold'>GPR:</span>{" "}
                      {hoverInfo.object.properties.GPR}
                    </div>
                  )}
                  {hoverInfo.object.properties.REGION_N && (
                    <div className='text-gray-600 mb-1'>
                      <span className='font-semibold'>Region:</span>{" "}
                      {hoverInfo.object.properties.REGION_N}
                    </div>
                  )}
                  {hoverInfo.object.properties.PLN_AREA_N && (
                    <div className='text-gray-600 mb-1'>
                      <span className='font-semibold'>Planning Area:</span>{" "}
                      {hoverInfo.object.properties.PLN_AREA_N}
                    </div>
                  )}
                </>
              )}

            {/* Other layers (Claude Generation, etc) */}
            {hoverInfo.object.properties?.type &&
              !hoverInfo.object.properties?.Description && (
                <>
                  <div className='font-bold text-gray-900 mb-1'>
                    {hoverInfo.object.properties.type}
                  </div>
                  {hoverInfo.object.properties.height && (
                    <div className='text-gray-600'>
                      <span className='font-semibold'>Height:</span>{" "}
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

      {/* Basemap Selector */}
      <div className='absolute bottom-4 right-4 z-10'>
        <div className='relative'>
          <button
            className='bg-white text-gray-700 px-4 py-2 rounded shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2'
            onClick={() => setBasemapSelectorOpen(!basemapSelectorOpen)}
          >
            <svg
              className='w-5 h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
              />
            </svg>
            {BASEMAPS[currentBasemap].name}
          </button>

          {basemapSelectorOpen && (
            <div className='absolute bottom-full mb-2 right-0 bg-white rounded shadow-lg overflow-hidden min-w-[200px]'>
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

      <div className='absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2'>
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
