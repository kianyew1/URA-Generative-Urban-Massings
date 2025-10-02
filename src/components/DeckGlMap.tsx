import React, { useState, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerControl } from "./LayerControl";
import { DrawToolbar } from "./DrawToolbar";
import { LayerManager, LayerConfig } from "./LayerManager";
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

  // Replace forceUpdate with a revision counter
  const [layerRevision, setLayerRevision] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editableData, setEditableData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [selectedFeatureIndexes] = useState<number[]>([]);
  const [drawnFeatureCounter, setDrawnFeatureCounter] = useState(0);

  const mode = useMemo(
    () => (isDrawing ? DrawPolygonMode : ViewMode),
    [isDrawing]
  );

  const handleEdit = useCallback((updatedData: any) => {
    setEditableData(updatedData);
  }, []);

  const handleStartDrawing = useCallback(() => {
    setIsDrawing(true);
    setEditableData({
      type: "FeatureCollection",
      features: [],
    });
    // Add editable layer
    if (!layerManager.getLayer("editable-layer")) {
      layerManager.addLayer({
        id: "editable-layer",
        name: "Drawing Layer",
        visible: true,
        type: "editable",
      });
    }
    setLayerRevision((prev) => prev + 1);
  }, [layerManager]);

  const handleCancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setEditableData({
      type: "FeatureCollection",
      features: [],
    });
    layerManager.removeLayer("editable-layer");
    setLayerRevision((prev) => prev + 1);
  }, [layerManager]);

  const handleSaveDrawing = useCallback(() => {
    if (editableData.features.length > 0) {
      const newLayerId = `drawn-polygon-${drawnFeatureCounter}`;
      layerManager.addLayer({
        id: newLayerId,
        name: `Polygon ${drawnFeatureCounter + 1}`,
        visible: true,
        type: "drawn",
        data: editableData,
      });
      setDrawnFeatureCounter((prev) => prev + 1);
      handleCancelDrawing();
    }
  }, [editableData, drawnFeatureCounter, layerManager, handleCancelDrawing]);

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
        editableData,
        selectedFeatureIndexes,
        handleEdit,
        mode
      ),
    [
      layerManager,
      editableData,
      selectedFeatureIndexes,
      handleEdit,
      mode,
      layerRevision,
    ]
  );

  return (
    <div className="relative w-full h-screen">
      <LayerControl
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        layers={layerManager.getAllLayers()}
        onLayerToggle={handleLayerToggle}
        onLayerRemove={handleLayerRemove}
      />

      <DrawToolbar
        isDrawing={isDrawing}
        onStartDrawing={handleStartDrawing}
        onCancelDrawing={handleCancelDrawing}
        onSaveDrawing={handleSaveDrawing}
        hasDrawnFeature={editableData.features.length > 0}
      />

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        getCursor={({ isDragging }) =>
          isDragging ? "grabbing" : isDrawing ? "crosshair" : "grab"
        }
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
