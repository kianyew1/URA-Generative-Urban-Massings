import { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { EditableGeoJsonLayer } from "@deck.gl-community/editable-layers";
import { GeoJsonFeatureProperties } from "./types/types";
import { getBuildingColor } from "./consts/const";

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  type: "geojson" | "editable" | "drawn";
  data?: any;
  geometry?: any;
}

export class LayerManager {
  private layers: Map<string, LayerConfig> = new Map();
  private drawnFeatures: any[] = [];

  constructor() {}

  addLayer(config: LayerConfig) {
    this.layers.set(config.id, config);
  }

  removeLayer(id: string) {
    this.layers.delete(id);
  }

  toggleLayer(id: string) {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = !layer.visible;
      this.layers.set(id, layer);
    }
  }

  getLayer(id: string): LayerConfig | undefined {
    return this.layers.get(id);
  }

  getAllLayers(): LayerConfig[] {
    return Array.from(this.layers.values());
  }

  getVisibleLayers(): LayerConfig[] {
    return Array.from(this.layers.values()).filter((layer) => layer.visible);
  }

  addDrawnFeature(feature: any) {
    this.drawnFeatures.push(feature);
  }

  getDrawnFeatures() {
    return this.drawnFeatures;
  }

  createDeckLayers(
    dataMap: Record<string, any>,
    editableData: any,
    selectedFeatureIndexes: number[],
    onEdit: (updatedData: any) => void,
    mode: any
  ): Layer[] {
    const deckLayers: Layer[] = [];

    this.layers.forEach((config) => {
      if (!config.visible) return;

      switch (config.type) {
        case "geojson":
          const layerData = dataMap[config.id] || config.data;
          if (layerData) {
            deckLayers.push(
              new GeoJsonLayer<GeoJsonFeatureProperties>({
                id: config.id,
                data: layerData,
                extruded: true,
                wireframe: true,
                filled: true,
                getElevation: (f) =>
                  f.properties.elevation || f.properties.height || 0,
                getFillColor: (f) =>
                  getBuildingColor(f.properties.type || f.properties.use),
                getLineColor: [255, 255, 255, 255],
                lineWidthMinPixels: 1,
                pickable: true,
              })
            );
          }
          break;

        case "editable":
          deckLayers.push(
            new EditableGeoJsonLayer({
              id: config.id,
              data: editableData,
              mode: mode,
              selectedFeatureIndexes: selectedFeatureIndexes,
              onEdit: onEdit,
              getFillColor: [200, 200, 200, 100],
              getLineColor: [0, 0, 0, 255],
              lineWidthMinPixels: 2,
              pickable: true,
            })
          );
          break;

        case "drawn":
          if (config.data) {
            deckLayers.push(
              new GeoJsonLayer({
                id: config.id,
                data: config.data,
                filled: true,
                getFillColor: [100, 200, 255, 150],
                getLineColor: [0, 100, 255, 255],
                lineWidthMinPixels: 2,
                pickable: true,
              })
            );
          }
          break;
      }
    });
    // Always add the editable layer for drawing
    deckLayers.push(
      new EditableGeoJsonLayer({
        id: "drawing-layer",
        data: editableData,
        mode: mode,
        selectedFeatureIndexes: selectedFeatureIndexes,
        onEdit: onEdit,
        getFillColor: [200, 200, 200, 100],
        getLineColor: [0, 0, 0, 255],
        lineWidthMinPixels: 2,
        pickable: true,
      })
    );

    return deckLayers;
  }
}
