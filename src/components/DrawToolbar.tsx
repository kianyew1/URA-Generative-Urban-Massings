import React from "react";

interface DrawToolbarProps {
  isDrawing: boolean;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onSaveDrawing: () => void;
  hasDrawnFeature: boolean;
}

export const DrawToolbar: React.FC<DrawToolbarProps> = ({
  isDrawing,
  onStartDrawing,
  onCancelDrawing,
  onSaveDrawing,
  hasDrawnFeature,
}) => {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-4 z-10">
      {!isDrawing ? (
        <button
          onClick={onStartDrawing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
        >
          Draw Polygon
        </button>
      ) : (
        <>
          <span className="text-sm text-gray-600 font-medium">
            Click to add points, double-click to finish
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancelDrawing}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
            {hasDrawnFeature && (
              <button
                onClick={onSaveDrawing}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
              >
                Save Polygon
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
