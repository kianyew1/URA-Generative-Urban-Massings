import { useCallback } from "react";
import { LayerManager } from "../LayerManager";
import { DrawRectangleMode } from "@deck.gl-community/editable-layers";

interface UseLayerOperationsProps {
  layerManager: LayerManager;
  setLayerRevision: React.Dispatch<React.SetStateAction<number>>;
  setFeatures: React.Dispatch<React.SetStateAction<any>>;
  setMode: React.Dispatch<React.SetStateAction<any>>;
  mode: any;
}

export function useLayerOperations({
  layerManager,
  setLayerRevision,
  setFeatures,
  setMode,
  mode,
}: UseLayerOperationsProps) {
  const handleEdit = useCallback(
    ({ updatedData, editType }: any) => {
      setFeatures(updatedData);

      if (editType === "addFeature" && updatedData.features.length > 0) {
        const newFeature =
          updatedData.features[updatedData.features.length - 1];

        const isRectangle = mode instanceof DrawRectangleMode;
        const layerId = `drawn-${
          isRectangle ? "bbox" : "polygon"
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

        layerManager.addLayer({
          id: layerId,
          name: isRectangle
            ? `Bounding Box ${
                layerManager
                  .getAllLayers()
                  .filter((l) => l.type === "drawn" && l.id.includes("bbox"))
                  .length + 1
              }`
            : `Polygon ${
                layerManager
                  .getAllLayers()
                  .filter((l) => l.type === "drawn" && l.id.includes("polygon"))
                  .length + 1
              }`,
          visible: true,
          type: "drawn",
          data: {
            type: "FeatureCollection",
            features: [newFeature],
          },
          geometry: newFeature.geometry,
          bounds: isRectangle ? bounds : undefined,
        });

        setFeatures({
          type: "FeatureCollection",
          features: [],
        });

        setMode(new (require("@deck.gl-community/editable-layers").ViewMode)());
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
