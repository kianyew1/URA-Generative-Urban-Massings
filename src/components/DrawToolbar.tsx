import React from "react";

interface DrawToolbarProps {
  isDrawing: boolean;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  features: any;
}

export const DrawToolbar: React.FC<DrawToolbarProps> = ({
  isDrawing,
  onStartDrawing,
  onStopDrawing,
  features,
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
            Click to add points • Double-click to finish polygon
          </span>
          <button
            onClick={onStopDrawing}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
          >
            Exit Drawing Mode
          </button>
          {features.features.length > 0 && (
            <span className="text-sm text-green-600 font-medium">
              {features.features.length} polygon(s) drawn
            </span>
          )}
        </>
      )}
    </div>
  );
};
