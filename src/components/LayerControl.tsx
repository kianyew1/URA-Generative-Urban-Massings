import React from "react";
import { LayerConfig } from "./LayerManager";
import { GeoJsonImporter } from "./GeoJsonImporter";

interface LayerControlProps {
  isOpen: boolean;
  onToggle: () => void;
  layers: LayerConfig[];
  onLayerToggle: (id: string) => void;
  onLayerRemove?: (id: string) => void;
  onGeoJsonImport?: (geojson: any, name: string) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  isOpen,
  onToggle,
  layers,
  onLayerToggle,
  onLayerRemove,
  onGeoJsonImport,
}) => {
  return (
    <div
      className={`absolute top-4 right-4 bg-white rounded-xl shadow-xl transition-all duration-300 z-10 ${
        isOpen ? "w-80" : "w-12"
      }`}
    >
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
          {onGeoJsonImport && <GeoJsonImporter onImport={onGeoJsonImport} />}

          <div
            className={`${
              onGeoJsonImport ? "mt-4 pt-4 border-t border-gray-200" : ""
            }`}
          >
            {layers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No layers added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="group flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
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
                      {layer.bounds && (
                        <div className="text-xs text-zinc-950 mt-1 font-mono">
                          <div>N: {layer.bounds.maxLat.toFixed(6)}</div>
                          <div>S: {layer.bounds.minLat.toFixed(6)}</div>
                          <div>E: {layer.bounds.maxLng.toFixed(6)}</div>
                          <div>W: {layer.bounds.minLng.toFixed(6)}</div>
                        </div>
                      )}
                    </div>
                    {onLayerRemove && (
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
