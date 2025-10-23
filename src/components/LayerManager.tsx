import { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { EditableGeoJsonLayer } from "@deck.gl-community/editable-layers";
import { GeoJsonFeatureProperties } from "./types/types";
import { getBuildingColor } from "./consts/const";

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  type: "geojson" | "editable" | "drawn" | "imported";
  data?: any;
  geometry?: any;
  bounds?: any;
}

// Color mapping for Singapore URA Master Plan land use types [R, G, B, OPACITY]
const LAND_USE_COLORS: Record<string, [number, number, number, number]> = {
  RESIDENTIAL: [252, 141, 98, 255],
  "RESIDENTIAL WITH COMMERCIAL AT 1ST STOREY": [252, 141, 98, 255],
  COMMERCIAL: [141, 160, 203, 255],
  "COMMERCIAL & RESIDENTIAL": [180, 120, 150, 255],
  "BUSINESS 1": [65, 182, 196, 255],
  "BUSINESS 2": [65, 182, 196, 255],
  "BUSINESS PARK": [44, 162, 95, 255],
  HOTEL: [153, 112, 171, 255],
  WHITE: [255, 255, 255, 255],
  "EDUCATIONAL INSTITUTION": [254, 217, 118, 255],
  "PLACE OF WORSHIP": [229, 196, 148, 255],
  "CIVIC & COMMUNITY INSTITUTION": [204, 235, 197, 255],
  "HEALTH & MEDICAL CARE": [247, 104, 161, 255],
  "OPEN SPACE": [102, 194, 165, 255],
  PARK: [35, 139, 69, 255],
  "RESERVE SITE": [254, 224, 144, 255],
  WATERBODY: [44, 127, 184, 255],
  ROAD: [200, 200, 200, 255],
  "RAPID TRANSIT SYSTEM": [128, 128, 128, 255],
  "PORT / AIRPORT": [0, 0, 0, 255],
  UTILITY: [255, 237, 160, 255],
  CEMETERY: [166, 97, 26, 255],
  "SPECIAL USE": [223, 194, 125, 255],
  AGRICULTURE: [140, 81, 10, 255],
  "SPORTS & RECREATION": [255, 0, 255, 255],
};

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
                    getBuildingColor(f.properties.type || f.properties.use),
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
                  getBuildingColor(f.properties?.type || f.properties?.use) || [
                    255, 200, 100, 200,
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
