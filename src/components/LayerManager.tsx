import { Layer } from "@deck.gl/core";
import { GeoJsonLayer, BitmapLayer } from "@deck.gl/layers";
import { EditableGeoJsonLayer } from "@deck.gl-community/editable-layers";
import { GeoJsonFeatureProperties } from "./types/types";
import { getBuildingColor } from "./consts/const";
import { LAND_USE_COLORS } from "./consts/const";

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  type: "geojson" | "editable" | "drawn" | "imported" | "bitmap";
  category?: "system" | "user"; // system = seeded layers, user = drawn/imported layers
  data?: any;
  geometry?: any;
  bounds?: any; // [minLon, minLat, maxLon, maxLat] for bitmap layers
  dimensions?: { width: number; height: number }; // width x height in meters
  image?: string; // URL for bitmap layer image
  opacity?: number; // Opacity for bitmap layers (0-1)
  modifiedFeatures?: Map<string, any>; // Track modified building features by feature ID
  isEditable?: boolean; // Flag to make layer editable
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

  // Building editing methods
  updateBuildingFeature(
    layerId: string,
    featureId: string,
    updatedFeature: any
  ) {
    const layer = this.layers.get(layerId);
    if (layer) {
      if (!layer.modifiedFeatures) {
        layer.modifiedFeatures = new Map();
      }
      layer.modifiedFeatures.set(featureId, updatedFeature);
    }
  }

  getModifiedFeatures(layerId: string): Map<string, any> | undefined {
    return this.layers.get(layerId)?.modifiedFeatures;
  }

  setLayerEditable(layerId: string, editable: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.isEditable = editable;
    }
  }

  // Apply modified features back to the layer's data when exiting edit mode
  applyModifiedFeaturesToLayer(layerId: string, updatedData: any): void {
    const layer = this.layers.get(layerId);
    if (layer && updatedData) {
      // Update the layer's data with the modified version
      layer.data = updatedData;
      // Clear the modified features tracking since they're now applied
      layer.modifiedFeatures = new Map();
      console.log(`Applied modified features to layer ${layerId}`);
    }
  }

  createDeckLayers(
    dataMap: Record<string, any>,
    editableData: any,
    selectedFeatureIndexes: number[],
    onEdit: (updatedData: any) => void,
    mode: any,
    editableBuildingData?: any,
    selectedBuildingIndexes?: number[],
    onBuildingEdit?: (updatedData: any) => void,
    buildingMode?: any
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
            // Special handling for Water Background - render as large blue base layer
            if (layer.id === "water-background") {
              deckLayers.push(
                new GeoJsonLayer({
                  id: layer.id,
                  data: layerData,
                  extruded: false,
                  wireframe: false,
                  filled: true,
                  stroked: false,
                  pickable: false,
                  getFillColor: [44, 127, 184, 255], // Blue color for water
                  updateTriggers: {
                    getFillColor: layer.visible,
                  },
                })
              );
            }
            // Special handling for Water layer - render as blue flat layer
            else if (layer.id === "water-layer") {
              deckLayers.push(
                new GeoJsonLayer({
                  id: layer.id,
                  data: layerData,
                  extruded: false,
                  wireframe: false,
                  filled: true,
                  stroked: true,
                  pickable: false,
                  getFillColor: [44, 127, 184, 255], // Blue color for water
                  getLineColor: [30, 90, 140, 255], // Darker blue for borders
                  getLineWidth: 2,
                  lineWidthMinPixels: 1,
                  updateTriggers: {
                    getFillColor: layer.visible,
                  },
                })
              );
            }
            // Special handling for Master Plan layer
            else if (layer.id === "master-plan") {
              deckLayers.push(
                new GeoJsonLayer({
                  id: layer.id,
                  data: layerData,
                  extruded: false,
                  wireframe: false,
                  filled: true,
                  stroked: false, // Disable strokes for better performance
                  pickable: true,
                  // Performance optimizations
                  binary: true,
                  // Reduce rendering quality for performance
                  parameters: {
                    depthTest: false,
                  },
                  getFillColor: (f: any) => {
                    // Extract LU_DESC from the HTML description
                    let luDesc = f.properties?.LU_DESC;

                    if (!luDesc && f.properties?.Description) {
                      luDesc = extractLuDesc(f.properties.Description);
                    }

                    // Return color based on LU_DESC
                    const color = LAND_USE_COLORS[luDesc] || [
                      180, 180, 180, 120,
                    ];
                    return color;
                  },
                  autoHighlight: false, // Disable auto-highlight for performance
                  updateTriggers: {
                    getFillColor: layer.visible,
                  },
                })
              );
            } else {
              // Regular 3D building layers - make editable if flagged
              if (
                layer.isEditable &&
                editableBuildingData &&
                buildingMode &&
                onBuildingEdit
              ) {
                // Use editableBuildingData which should contain this layer's data
                deckLayers.push(
                  new EditableGeoJsonLayer({
                    id: `${layer.id}-editable`,
                    data: editableBuildingData,
                    mode: buildingMode,
                    selectedFeatureIndexes: selectedBuildingIndexes || [],
                    onEdit: onBuildingEdit,
                    pickable: true,
                    getFillColor: (f: any) => {
                      const baseColor = getBuildingColor(
                        f.properties?.type || f.properties?.use
                      ) as [number, number, number, number];
                      // Highlight selected building
                      if (
                        selectedBuildingIndexes &&
                        selectedBuildingIndexes.length > 0
                      ) {
                        const featureIndex =
                          editableBuildingData.features?.indexOf(f);
                        if (selectedBuildingIndexes.includes(featureIndex)) {
                          return [255, 255, 0, 200]; // Yellow for selected
                        }
                      }
                      return baseColor;
                    },
                    getLineColor: [255, 255, 255, 255],
                    lineWidthMinPixels: 2,
                  }) as any // Cast to any to allow 3D properties
                );
              } else {
                // Regular non-editable building layer
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
                      getBuildingColor(
                        f.properties.type || f.properties.use
                      ) as [number, number, number, number],
                    getLineColor: [255, 255, 255, 255],
                    lineWidthMinPixels: 1,
                    autoHighlight: true,
                    highlightColor: [255, 255, 0, 100],
                  })
                );
              }
            }
          }
          break;

        case "imported":
          if (layer.data) {
            // Make imported layers editable if flagged (for generated buildings)
            if (
              layer.isEditable &&
              editableBuildingData &&
              buildingMode &&
              onBuildingEdit
            ) {
              // Use editableBuildingData which should contain this layer's data
              deckLayers.push(
                new EditableGeoJsonLayer({
                  id: `${layer.id}-editable`,
                  data: editableBuildingData,
                  mode: buildingMode,
                  selectedFeatureIndexes: selectedBuildingIndexes || [],
                  onEdit: onBuildingEdit,
                  pickable: true,
                  getFillColor: (f: any) => {
                    const baseColor = (getBuildingColor(
                      f.properties?.type || f.properties?.use
                    ) || [255, 200, 100, 200]) as [
                      number,
                      number,
                      number,
                      number
                    ];
                    // Highlight selected building
                    if (
                      selectedBuildingIndexes &&
                      selectedBuildingIndexes.length > 0
                    ) {
                      const featureIndex =
                        editableBuildingData.features?.indexOf(f);
                      if (selectedBuildingIndexes.includes(featureIndex)) {
                        return [255, 255, 0, 200]; // Yellow for selected
                      }
                    }
                    return baseColor;
                  },
                  getLineColor: [255, 140, 0, 255],
                  lineWidthMinPixels: 2,
                }) as any // Cast to any to allow 3D properties
              );
            } else {
              // Regular non-editable imported layer
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

        case "bitmap":
          if (
            layer.image &&
            layer.bounds &&
            Array.isArray(layer.bounds) &&
            layer.bounds.length === 4
          ) {
            // Validate all bounds are valid numbers
            const boundsValid = layer.bounds.every(
              (b: any) => typeof b === "number" && !isNaN(b)
            );
            if (boundsValid) {
              console.log(
                `Creating BitmapLayer ${layer.id} with bounds:`,
                layer.bounds
              );
              deckLayers.push(
                new BitmapLayer({
                  id: layer.id,
                  bounds: layer.bounds as [number, number, number, number],
                  image: layer.image,
                  opacity: layer.opacity ?? 0.8,
                  pickable: false,
                })
              );
            } else {
              console.error(
                `Invalid bounds for bitmap layer ${layer.id}:`,
                layer.bounds
              );
            }
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
