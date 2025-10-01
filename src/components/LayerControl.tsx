import { Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { LayerControlProps } from "./types/types";

export function LayerControl({
  isOpen,
  onToggle,
  layersVisible,
  onLayerToggle,
}: LayerControlProps) {
  return (
    <>
      {/* Sidebar */}
      <div
        className={`absolute top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 z-10 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "280px" }}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-800">
              Layer Control
            </h2>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={layersVisible.urbanMassing}
                onChange={() => onLayerToggle("urbanMassing")}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Urban Massing
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
        style={{
          transform: isOpen ? "translateX(280px)" : "translateX(0)",
          transition: "transform 0.3s",
        }}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-700" />
        )}
      </button>
    </>
  );
}
