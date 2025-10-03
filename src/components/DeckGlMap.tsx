import React, { useState, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerControl } from "./LayerControl";
// import { DrawToolbar } from "./DrawToolbar";
import { LayerManager } from "./LayerManager";
import { GEOJSON_DATA } from "./consts/const";
import { DrawPolygonMode, ViewMode } from "@deck.gl-community/editable-layers";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layerManager] = useState(() => {
    const manager = new LayerManager();
    manager.addLayer({
      id: "urban-massing",
      name: "Urban Massing",
      visible: true,
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
        GEOJSON_DATA,
        features,
        selectedFeatureIndexes,
        handleEdit,
        mode
      ),
    [
      layerManager,
      features,
      selectedFeatureIndexes,
      handleEdit,
      mode,
      layerRevision,
    ]
  );

  // const isDrawing = mode === DrawPolygonMode;

  return (
    <div className="relative w-full h-screen">
      <LayerControl
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        layers={layerManager.getAllLayers()}
        onLayerToggle={handleLayerToggle}
        onLayerRemove={handleLayerRemove}
      />

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
      >
        <Map
          {...viewState}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          mapLib={import("maplibre-gl")}
        />
      </DeckGL>
    </div>
  );
}
