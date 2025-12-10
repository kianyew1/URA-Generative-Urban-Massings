import React, { useState } from "react";
import { GeoJsonImporter } from "./GeoJsonImporter";
import { ScreenshotDialog } from "./ScreenshotDialog";

interface LayerControlProps {
  isOpen: boolean;
  onToggle: () => void;
  layers: any[];
  onLayerToggle: (id: string) => void;
  onLayerRemove: (id: string) => void;
  onGeoJsonImport: (geojson: any, name: string) => void;
  onCaptureScreenshot?: (layerId: string) => Promise<string>; // Updated to return screenshot URL
  boundingBox: any;
  manager: any;
}

export function LayerControl({
  isOpen,
  onToggle,
  layers,
  onLayerToggle,
  onLayerRemove,
  onGeoJsonImport,
  onCaptureScreenshot,
  boundingBox,
  manager,
}: LayerControlProps) {
  const [screenshotDialog, setScreenshotDialog] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    layerId: string | null;
    dimensions?: { width: number; height: number };
  }>({
    isOpen: false,
    imageUrl: null,
    layerId: null,
  });

  const handleScreenshotClick = async (layerId: string) => {
    if (!onCaptureScreenshot) return;

    // Get the layer to extract dimensions
    const layer = layers.find((l) => l.id === layerId);
    const dimensions = layer?.dimensions;

    // Capture screenshot and get the image URL
    const imageUrl = await onCaptureScreenshot(layerId);

    // Open dialog with the screenshot and dimensions
    setScreenshotDialog({
      isOpen: true,
      imageUrl: imageUrl,
      layerId: layerId,
      dimensions: dimensions,
    });
  };

  const handlePromptSubmit = (prompt: string) => {
    console.log("Submitted prompt:", prompt);
    console.log("Layer ID:", screenshotDialog.layerId);
    console.log("Screenshot URL:", screenshotDialog.imageUrl);
    // TODO: Add your AI generation logic here
  };

  const handleDownloadLayer = (layer: any) => {
    // Get the layer data - use either data or geometry
    const layerData =
      layer.data ||
      (layer.geometry
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: layer.geometry,
                properties: {},
              },
            ],
          }
        : null);

    if (!layerData) {
      console.error("No data available for download");
      return;
    }

    // Create a blob from the GeoJSON data
    const jsonString = JSON.stringify(layerData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layer.name.replace(/\s+/g, "_")}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "320px" }}
      >
        {/* ...existing code... */}
        <button
          onClick={onToggle}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-xl transition-colors"
        >
          <span
            className={`font-bold text-gray-900 text-lg ${!isOpen && "hidden"}`}
          >
            Layers
          </span>
          <svg
            className={`w-5 h-5 text-gray-700 transition-transform ${
              isOpen ? "rotate-0" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="p-4 border-t border-gray-100 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {!!onGeoJsonImport && (
              <GeoJsonImporter onImport={onGeoJsonImport} />
            )}

            <div
              className={`${
                !!onGeoJsonImport ? "mt-4 pt-4 border-t border-gray-200" : ""
              }`}
            >
              {layers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No layers added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* System Layers Section */}
                  {layers.filter((l) => l.category === "system").length > 0 && (
                    <div>
                      <div className="mb-2 px-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          System Layers
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {layers
                          .filter((l) => l.category === "system")
                          .map((layer) => (
                            <div
                              key={layer.id}
                              className="group flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                            >
                              <input
                                type="checkbox"
                                checked={layer.visible}
                                onChange={() => onLayerToggle(layer.id)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {layer.name}
                                </div>
                                {layer.geometry && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                                      View GeoJSON ▼
                                    </summary>
                                    <pre className="mt-2 p-3 bg-white rounded-md text-xs overflow-auto max-h-40 border border-gray-200 text-gray-700">
                                      {JSON.stringify(layer.geometry, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* User Layers Section */}
                  {layers.filter((l) => l.category === "user" || !l.category)
                    .length > 0 && (
                    <div>
                      <div className="mb-2 px-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          User Layers
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {layers
                          .filter((l) => l.category === "user" || !l.category)
                          .map((layer) => (
                            <div
                              key={layer.id}
                              className="group flex items-start gap-3 p-3 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors border border-gray-200"
                            >
                              <input
                                type="checkbox"
                                checked={layer.visible}
                                onChange={() => onLayerToggle(layer.id)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {layer.name}
                                </div>
                                {layer.geometry && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                                      View GeoJSON ▼
                                    </summary>
                                    <pre className="mt-2 p-3 bg-white rounded-md text-xs overflow-auto max-h-40 border border-gray-200 text-gray-700">
                                      {JSON.stringify(layer.geometry, null, 2)}
                                    </pre>
                                  </details>
                                )}
                                {layer.bounds &&
                                  Array.isArray(layer.bounds) &&
                                  layer.bounds.length === 4 &&
                                  layer.bounds.every(
                                    (b: any) =>
                                      typeof b === "number" && !isNaN(b)
                                  ) && (
                                    <div className="text-xs text-zinc-950 mt-1 font-mono">
                                      <div>N: {layer.bounds[3].toFixed(6)}</div>
                                      <div>S: {layer.bounds[1].toFixed(6)}</div>
                                      <div>E: {layer.bounds[2].toFixed(6)}</div>
                                      <div>W: {layer.bounds[0].toFixed(6)}</div>
                                      {layer.dimensions && (
                                        <div className="mt-2 pt-2 border-t border-gray-300">
                                          <span className="font-semibold">
                                            Dimensions:{" "}
                                          </span>
                                          {layer.dimensions.width.toFixed(1)}m ×{" "}
                                          {layer.dimensions.height.toFixed(1)}m
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {/* Download button - for all user layers */}
                                <button
                                  onClick={() => handleDownloadLayer(layer)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-all"
                                  title="Download GeoJSON"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                </button>
                                {/* Screenshot button - only for bounding boxes */}
                                {layer.type === "drawn" &&
                                  layer.bounds &&
                                  !!onCaptureScreenshot && (
                                    <button
                                      onClick={() =>
                                        handleScreenshotClick(layer.id)
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-all"
                                      title="Capture screenshot"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                {/* Remove button */}
                                {!!onLayerRemove && (
                                  <button
                                    onClick={() => onLayerRemove(layer.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-all"
                                    title="Remove layer"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-30 p-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          title="Open Layers"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Screenshot Dialog */}
      <ScreenshotDialog
        isOpen={screenshotDialog.isOpen}
        onClose={() =>
          setScreenshotDialog({ isOpen: false, imageUrl: null, layerId: null })
        }
        screenshotUrl={screenshotDialog.imageUrl}
        onSubmit={handlePromptSubmit}
        boundingBox={boundingBox}
        layerManager={manager}
        dimensions={screenshotDialog.dimensions}
      />
    </>
  );
}
