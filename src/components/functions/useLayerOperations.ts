import { useCallback } from "react";
import { LayerManager } from "../LayerManager";
import {
  DrawRectangleMode,
  ViewMode,
  DrawSquareMode,
  ModifyMode,
} from "@deck.gl-community/editable-layers";

interface UseLayerOperationsProps {
  layerManager: LayerManager;
  setLayerRevision: React.Dispatch<React.SetStateAction<number>>;
  setFeatures: React.Dispatch<React.SetStateAction<any>>;
  setMode: React.Dispatch<React.SetStateAction<any>>;
  mode: any;
  setBoundingBox: any;
  setBuildingEditData?: React.Dispatch<React.SetStateAction<any>>;
  setBuildingMode?: React.Dispatch<React.SetStateAction<any>>;
  setSelectedBuildingIndexes?: React.Dispatch<React.SetStateAction<number[]>>;
  buildingEditData?: any;
  activeEditLayerId?: string; // Track which layer is currently being edited
}
export function useLayerOperations({
  layerManager,
  setLayerRevision,
  setFeatures,
  setMode,
  mode,
  setBoundingBox,
  setBuildingEditData,
  setBuildingMode,
  setSelectedBuildingIndexes,
  buildingEditData,
  activeEditLayerId,
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

  // Building editing handlers
  const handleBuildingEdit = useCallback(
    ({ updatedData, editType, editContext }: any) => {
      console.log("Building edit:", { editType, editContext, updatedData });

      if (setBuildingEditData) {
        setBuildingEditData(updatedData);
      }

      // Track modifications in layer manager
      if (
        editType === "updateTentativeFeature" ||
        editType === "finishMovePosition"
      ) {
        if (activeEditLayerId) {
          updatedData.features?.forEach((feature: any, index: number) => {
            const featureId = feature.id || `feature-${index}`;
            layerManager.updateBuildingFeature(
              activeEditLayerId,
              featureId,
              feature
            );
          });
        }
      }
    },
    [layerManager, setBuildingEditData, activeEditLayerId]
  );

  const handleBuildingSelect = useCallback(
    (info: any) => {
      if (!info.object || !buildingEditData || !setSelectedBuildingIndexes)
        return;

      const featureIndex = buildingEditData.features?.findIndex(
        (f: any) => f === info.object
      );

      if (featureIndex !== -1) {
        setSelectedBuildingIndexes([featureIndex]);
        console.log("Selected building index:", featureIndex);
      }
    },
    [buildingEditData, setSelectedBuildingIndexes]
  );

  const handleBuildingHeightChange = useCallback(
    (featureIndex: number, newHeight: number) => {
      if (!buildingEditData || !setBuildingEditData) return;

      const updatedData = {
        ...buildingEditData,
        features: buildingEditData.features.map((feature: any, idx: number) => {
          if (idx === featureIndex) {
            return {
              ...feature,
              properties: {
                ...feature.properties,
                height: newHeight,
              },
            };
          }
          return feature;
        }),
      };

      setBuildingEditData(updatedData);

      if (activeEditLayerId) {
        const feature = updatedData.features[featureIndex];
        const featureId = feature.id || `feature-${featureIndex}`;
        layerManager.updateBuildingFeature(
          activeEditLayerId,
          featureId,
          feature
        );
      }
      setLayerRevision((prev) => prev + 1);
    },
    [
      buildingEditData,
      setBuildingEditData,
      layerManager,
      setLayerRevision,
      activeEditLayerId,
    ]
  );

  const handleBuildingDelete = useCallback(
    (featureIndex: number) => {
      if (!buildingEditData || !setBuildingEditData) return;

      const updatedData = {
        ...buildingEditData,
        features: buildingEditData.features.filter(
          (_: any, idx: number) => idx !== featureIndex
        ),
      };

      setBuildingEditData(updatedData);

      if (setSelectedBuildingIndexes) {
        setSelectedBuildingIndexes([]);
      }

      setLayerRevision((prev) => prev + 1);
    },
    [
      buildingEditData,
      setBuildingEditData,
      setSelectedBuildingIndexes,
      setLayerRevision,
    ]
  );

  const toggleBuildingEditMode = useCallback(
    (enabled: boolean, layerId?: string) => {
      // If enabling, use the provided layerId or default to building-outline
      const targetLayerId = layerId || activeEditLayerId || "building-outline";

      // If disabling, apply the modified features back to the layer data
      if (!enabled && activeEditLayerId && buildingEditData) {
        console.log("Applying modified features to layer:", activeEditLayerId);
        layerManager.applyModifiedFeaturesToLayer(
          activeEditLayerId,
          buildingEditData
        );
      }

      // Disable all other layers first
      layerManager.getAllLayers().forEach((layer) => {
        if (layer.isEditable) {
          layerManager.setLayerEditable(layer.id, false);
        }
      });

      // Enable the target layer
      if (enabled) {
        layerManager.setLayerEditable(targetLayerId, true);
      }

      if (setBuildingMode) {
        setBuildingMode(enabled ? new ModifyMode() : new ViewMode());
      }

      if (setSelectedBuildingIndexes) {
        setSelectedBuildingIndexes([]);
      }

      setLayerRevision((prev) => prev + 1);
    },
    [
      layerManager,
      setBuildingMode,
      setSelectedBuildingIndexes,
      setLayerRevision,
      activeEditLayerId,
      buildingEditData,
    ]
  );

  return {
    handleEdit,
    handleGeoJsonImport,
    handleLayerToggle,
    handleLayerRemove,
    handleBuildingEdit,
    handleBuildingSelect,
    handleBuildingHeightChange,
    handleBuildingDelete,
    toggleBuildingEditMode,
  };
}
