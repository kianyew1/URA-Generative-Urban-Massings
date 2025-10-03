import React from "react";
import { LayerConfig } from "./LayerManager";

interface LayerControlProps {
  isOpen: boolean;
  onToggle: () => void;
  layers: LayerConfig[];
  onLayerToggle: (id: string) => void;
  onLayerRemove?: (id: string) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  isOpen,
  onToggle,
  layers,
  onLayerToggle,
  onLayerRemove,
}) => {
  return (
    <div
      className={`absolute top-4 right-4 bg-white rounded-lg shadow-lg transition-all duration-300 z-10 ${
        isOpen ? "w-64" : "w-12"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
      >
        <span className={`font-semibold ${!isOpen && "hidden"}`}>Layers</span>
        <svg
          className={`w-5 h-5 transition-transform ${
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
        <div className="p-4 border-t border-gray-200">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="group flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 flex-1">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onLayerToggle(layer.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{layer.name}</div>
                  {layer.geometry && (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View GeoJSON
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(layer.geometry, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              <button
                onClick={() => onLayerRemove(layer.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-opacity"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
