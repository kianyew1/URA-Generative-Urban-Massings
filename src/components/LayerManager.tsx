import { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { EditableGeoJsonLayer } from "@deck.gl-community/editable-layers";
import { GeoJsonFeatureProperties } from "./types/types";
import { getBuildingColor } from "./consts/const";
import { LAND_USE_COLORS } from "./consts/const";

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  type: "geojson" | "editable" | "drawn" | "imported";
  data?: any;
  geometry?: any;
  bounds?: any;
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

  getLayer(id: string) {
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

    // Helper function to extract LU_DESC from HTML description
    const extractLuDesc = (description: string): string | null => {
      if (!description) return null;
      const match = description.match(/<th>LU_DESC<\/th>\s*<td>([^<]+)<\/td>/);
      return match ? match[1].trim() : null;
    };

    this.layers.forEach((layer) => {
      if (!layer.visible) return;

      switch (layer.type) {
        case "geojson":
          const layerData = dataMap[layer.id] || layer.data;
          if (layerData) {
            // Special handling for Master Plan layer
            if (layer.id === "master-plan") {
              deckLayers.push(
                new GeoJsonLayer({
                  id: layer.id,
                  data: layerData,
                  extruded: false,
                  wireframe: false,
                  filled: true,
                  stroked: true,
                  pickable: true,
                  getFillColor: (f: any) => {
                    // Extract LU_DESC from the HTML description
                    let luDesc = f.properties?.LU_DESC;

                    if (!luDesc && f.properties?.Description) {
                      luDesc = extractLuDesc(f.properties.Description);
                    }

                    // Return color based on LU_DESC
                    const color = LAND_USE_COLORS[luDesc] || [
                      180, 180, 180, 100,
                    ];
                    return color;
                  },
                  getLineColor: [80, 80, 80, 150],
                  getLineWidth: 1,
                  lineWidthMinPixels: 1,
                  autoHighlight: true,
                  highlightColor: [255, 255, 0, 150],
                  updateTriggers: {
                    getFillColor: layer.visible,
                  },
                })
              );
            } else {
              // Regular 3D building layers
              deckLayers.push(
                new GeoJsonLayer<GeoJsonFeatureProperties>({
                  id: layer.id,
                  data: layerData,
                  extruded: true,
                  wireframe: true,
                  filled: true,
                  pickable: true,
                  getElevation: (f) =>
                    f.properties.elevation || f.properties.height || 0,
                  getFillColor: (f) =>
                    getBuildingColor(f.properties.type || f.properties.use) as [
                      number,
                      number,
                      number,
                      number
                    ],
                  getLineColor: [255, 255, 255, 255],
                  lineWidthMinPixels: 1,
                  autoHighlight: true,
                  highlightColor: [255, 255, 0, 100],
                })
              );
            }
          }
          break;

        case "imported":
          if (layer.data) {
            deckLayers.push(
              new GeoJsonLayer({
                id: layer.id,
                data: layer.data,
                extruded: true,
                wireframe: true,
                filled: true,
                stroked: true,
                pickable: true,
                getElevation: (f: any) =>
                  f.properties?.elevation || f.properties?.height || 50,
                getFillColor: (f: any) =>
                  (getBuildingColor(
                    f.properties?.type || f.properties?.use
                  ) || [255, 200, 100, 200]) as [
                    number,
                    number,
                    number,
                    number
                  ],
                getLineColor: [255, 140, 0, 255],
                lineWidthMinPixels: 2,
                autoHighlight: true,
                highlightColor: [255, 255, 0, 150],
              })
            );
          }
          break;

        case "editable":
          deckLayers.push(
            new EditableGeoJsonLayer({
              id: layer.id,
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
          if (layer.data) {
            deckLayers.push(
              new GeoJsonLayer({
                id: layer.id,
                data: layer.data,
                filled: true,
                pickable: true,
                getFillColor: [100, 200, 255, 150],
                getLineColor: [0, 100, 255, 255],
                lineWidthMinPixels: 2,
                autoHighlight: true,
                highlightColor: [255, 255, 0, 150],
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
