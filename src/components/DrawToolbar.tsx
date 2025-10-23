import React from "react";

interface DrawToolbarProps {
  isDrawing: boolean;
  isDrawingBoundingBox: boolean;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onStartDrawingBoundingBox: () => void;
  onStopDrawingBoundingBox: () => void;
  features: any;
}

export const DrawToolbar: React.FC<DrawToolbarProps> = ({
  isDrawing,
  isDrawingBoundingBox,
  onStartDrawing,
  onStopDrawing,
  onStartDrawingBoundingBox,
  onStopDrawingBoundingBox,
  features,
}) => {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-4 z-10">
      {!isDrawing && !isDrawingBoundingBox ? (
        <>
          <button
            onClick={onStartDrawing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Draw Polygon
          </button>
          <button
            onClick={onStartDrawingBoundingBox}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
              />
            </svg>
            Draw Bounding Box
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-600 font-medium">
            {isDrawing
              ? "Click to add points • Double-click to finish polygon"
              : "Click and drag to draw a bounding box"}
          </span>
          <button
            onClick={isDrawing ? onStopDrawing : onStopDrawingBoundingBox}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
          >
            Exit Drawing Mode
          </button>
          {features.features.length > 0 && (
            <span className="text-sm text-green-600 font-medium">
              {features.features.length} shape(s) drawn
            </span>
          )}
        </>
      )}
    </div>
  );
};
