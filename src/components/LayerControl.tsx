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
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2"
            >
              <label className="flex items-center cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onLayerToggle(layer.id)}
                  className="mr-2 cursor-pointer"
                />
                <span className="text-sm">{layer.name}</span>
              </label>
              {layer.type === "drawn" && onLayerRemove && (
                <button
                  onClick={() => onLayerRemove(layer.id)}
                  className="ml-2 text-red-500 hover:text-red-700"
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
  );
};
