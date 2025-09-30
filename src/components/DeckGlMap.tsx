import React, { useState } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// Initial camera position - Sembawang waterfront area, Singapore
const INITIAL_VIEW_STATE = {
  longitude: 103.8198, // Sembawang waterfront
  latitude: 1.4554,
  zoom: 15,
  pitch: 45, // Set pitch for 3D view
  bearing: -20,
};

// Urban massing for Sembawang waterfront area
const GEOJSON_DATA = {
  type: "FeatureCollection",
  features: [
    // High-rise residential towers
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.819, 1.456],
            [103.819, 1.4565],
            [103.8195, 1.4565],
            [103.8195, 1.456],
            [103.819, 1.456],
          ],
        ],
      },
      properties: {
        elevation: 120,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.82, 1.4558],
            [103.82, 1.4563],
            [103.8205, 1.4563],
            [103.8205, 1.4558],
            [103.82, 1.4558],
          ],
        ],
      },
      properties: {
        elevation: 135,
        type: "residential",
      },
    },
    // Mid-rise commercial buildings
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8185, 1.4548],
            [103.8185, 1.4552],
            [103.8192, 1.4552],
            [103.8192, 1.4548],
            [103.8185, 1.4548],
          ],
        ],
      },
      properties: {
        elevation: 60,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8198, 1.4545],
            [103.8198, 1.455],
            [103.8203, 1.455],
            [103.8203, 1.4545],
            [103.8198, 1.4545],
          ],
        ],
      },
      properties: {
        elevation: 45,
        type: "commercial",
      },
    },
    // Waterfront development
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8205, 1.4552],
            [103.8205, 1.4557],
            [103.8215, 1.4557],
            [103.8215, 1.4552],
            [103.8205, 1.4552],
          ],
        ],
      },
      properties: {
        elevation: 80,
        type: "mixed_use",
      },
    },
    // Low-rise shophouses
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.818, 1.454],
            [103.818, 1.4544],
            [103.8188, 1.4544],
            [103.8188, 1.454],
            [103.818, 1.454],
          ],
        ],
      },
      properties: {
        elevation: 15,
        type: "shophouse",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.819, 1.4538],
            [103.819, 1.4542],
            [103.8197, 1.4542],
            [103.8197, 1.4538],
            [103.819, 1.4538],
          ],
        ],
      },
      properties: {
        elevation: 18,
        type: "shophouse",
      },
    },
    // Industrial/warehouse buildings
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8175, 1.4535],
            [103.8175, 1.4542],
            [103.8185, 1.4542],
            [103.8185, 1.4535],
            [103.8175, 1.4535],
          ],
        ],
      },
      properties: {
        elevation: 25,
        type: "industrial",
      },
    },
  ],
};

// Type for the GeoJSON feature properties
interface GeoJsonFeatureProperties {
  elevation: number;
  type: string;
}

// Function to get color based on building type
const getBuildingColor = (type: string) => {
  switch (type) {
    case "residential":
      return [70, 130, 180, 150]; // Steel blue
    case "commercial":
      return [255, 165, 0, 150]; // Orange
    case "mixed_use":
      return [147, 112, 219, 150]; // Medium slate blue
    case "shophouse":
      return [255, 69, 0, 150]; // Red orange
    case "industrial":
      return [128, 128, 128, 150]; // Gray
    default:
      return [255, 0, 0, 150]; // Red fallback
  }
};

export default function DeckGlMap() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Create the deck.gl layer for 3D GeoJSON visualization
  const layers = [
    new GeoJsonLayer<GeoJsonFeatureProperties>({
      id: "geojson-layer",
      data: GEOJSON_DATA,
      // 3D properties
      extruded: true,
      wireframe: true,
      filled: true,
      // Accessors for 3D height and color
      getElevation: (f) => f.properties.elevation,
      getFillColor: (f) => getBuildingColor(f.properties.type),
      getLineColor: [255, 255, 255, 255], // White wireframe
      lineWidthMinPixels: 1,
      pickable: true, // Enable interaction
    }),
  ];

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true} // Allows map interaction (pan, zoom, pitch)
      layers={layers}
      onViewStateChange={({ viewState }) => setViewState(viewState)}
    >
      {/* Base map layer (using MapLibre GL for the background map) */}
      <Map
        {...viewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        mapLib={import("maplibre-gl")}
      />
    </DeckGL>
  );
}
