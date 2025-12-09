import { useCallback } from "react";
import { LayerManager } from "../LayerManager";
import {
  DrawRectangleMode,
  ViewMode,
  DrawSquareMode,
} from "@deck.gl-community/editable-layers";

interface UseLayerOperationsProps {
  layerManager: LayerManager;
  setLayerRevision: React.Dispatch<React.SetStateAction<number>>;
  setFeatures: React.Dispatch<React.SetStateAction<any>>;
  setMode: React.Dispatch<React.SetStateAction<any>>;
  mode: any;
  setBoundingBox: any;
}
export function useLayerOperations({
  layerManager,
  setLayerRevision,
  setFeatures,
  setMode,
  mode,
  setBoundingBox,
}: UseLayerOperationsProps) {
  const handleEdit = useCallback(
    ({ updatedData, editType }: any) => {
      setFeatures(updatedData);

      if (editType === "addFeature" && updatedData.features.length > 0) {
        const newFeature =
          updatedData.features[updatedData.features.length - 1];

        const isRectangle = mode instanceof DrawRectangleMode;
        const isSquare = mode instanceof DrawSquareMode;
        const layerId = `drawn-${
          isRectangle || isSquare ? "bbox" : "polygon"
        }-${Date.now()}`;

        const coordinates = newFeature.geometry.coordinates[0];
        const lngs = coordinates.map((coord: number[]) => coord[0]);
        const lats = coordinates.map((coord: number[]) => coord[1]);
        const bounds = {
          minLng: Math.min(...lngs),
          maxLng: Math.max(...lngs),
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
        };

        // Calculate dimensions in meters for bounding box
        let dimensions: { width: number; height: number } | undefined =
          undefined;
        if (isRectangle || isSquare) {
          const { minLng, maxLng, minLat, maxLat } = bounds;

          // Calculate real-world distance in meters
          const centerLat = (maxLat + minLat) / 2;
          const metersPerDegreeLat = 111320; // roughly constant
          const metersPerDegreeLng =
            111320 * Math.cos((centerLat * Math.PI) / 180);

          const widthMeters = (maxLng - minLng) * metersPerDegreeLng;
          const heightMeters = (maxLat - minLat) * metersPerDegreeLat;

          dimensions = {
            width: Math.round(widthMeters * 10) / 10, // round to 1 decimal
            height: Math.round(heightMeters * 10) / 10,
          };

          console.log("Bounding box dimensions calculated:", {
            bounds,
            dimensions,
          });
        }

        layerManager.addLayer({
          id: layerId,
          name: isSquare
            ? `Square ${
                layerManager
                  .getAllLayers()
                  .filter(
                    (l) => l.type === "drawn" && l.name?.includes("Square")
                  ).length + 1
              }`
            : isRectangle
            ? `Bounding Box ${
                layerManager
                  .getAllLayers()
                  .filter(
                    (l) =>
                      l.type === "drawn" &&
                      l.id.includes("bbox") &&
                      !l.name?.includes("Square")
                  ).length + 1
              }`
            : `Polygon ${
                layerManager
                  .getAllLayers()
                  .filter((l) => l.type === "drawn" && l.id.includes("polygon"))
                  .length + 1
              }`,
          visible: true,
          type: "drawn",
          category: "user",
          data: {
            type: "FeatureCollection",
            features: [newFeature],
          },
          geometry: newFeature.geometry,
          bounds: isRectangle || isSquare ? bounds : undefined,
          dimensions: dimensions,
        });

        // Extract bounding box coordinates
        if (newFeature && newFeature.geometry && setBoundingBox) {
          setBoundingBox(newFeature.geometry);
        }

        setFeatures({
          type: "FeatureCollection",
          features: [],
        });

        setMode(new ViewMode());
        setLayerRevision((prev) => prev + 1);
      }
    },
    [layerManager, mode, setFeatures, setMode, setLayerRevision]
  );

  const handleGeoJsonImport = useCallback(
    (geojson: any, name: string) => {
      console.log("Importing GeoJSON:", geojson);
      const layerId = `imported-${Date.now()}`;

      const data =
        geojson.type === "FeatureCollection"
          ? geojson
          : {
              type: "FeatureCollection",
              features:
                geojson.type === "Feature"
                  ? [geojson]
                  : [
                      {
                        type: "Feature",
                        geometry: geojson,
                        properties: {},
                      },
                    ],
            };

      console.log("Processed data:", data);

      layerManager.addLayer({
        id: layerId,
        name: name,
        visible: true,
        type: "imported",
        category: "user",
        data: data,
      });

      console.log("All layers:", layerManager.getAllLayers());
      setLayerRevision((prev) => prev + 1);
    },
    [layerManager, setLayerRevision]
  );

  const handleLayerToggle = useCallback(
    (id: string) => {
      layerManager.toggleLayer(id);
      setLayerRevision((prev) => prev + 1);
    },
    [layerManager, setLayerRevision]
  );

  const handleLayerRemove = useCallback(
    (id: string) => {
      layerManager.removeLayer(id);
      setLayerRevision((prev) => prev + 1);
    },
    [layerManager, setLayerRevision]
  );

  return {
    handleEdit,
    handleGeoJsonImport,
    handleLayerToggle,
    handleLayerRemove,
  };
}
