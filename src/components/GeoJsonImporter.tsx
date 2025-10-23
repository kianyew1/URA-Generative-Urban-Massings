import React, { useState } from "react";

interface GeoJsonImporterProps {
  onImport: (geojson: any, name: string) => void;
}

export const GeoJsonImporter: React.FC<GeoJsonImporterProps> = ({
  onImport,
}) => {
  const [geojsonText, setGeojsonText] = useState("");
  const [layerName, setLayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleImport = () => {
    setError(null);

    if (!layerName.trim()) {
      setError("Please provide a layer name");
      return;
    }

    if (!geojsonText.trim()) {
      setError("Please paste GeoJSON content");
      return;
    }

    try {
      // Clean the input - remove any BOM, trim whitespace
      let cleanedText = geojsonText.trim().replace(/^\uFEFF/, "");

      // Try to convert JS object notation to proper JSON
      // This handles cases where property names aren't quoted
      try {
        // First try normal JSON parse
        const parsed = JSON.parse(cleanedText);
        validateAndImport(parsed);
      } catch (firstError) {
        // If that fails, try to evaluate as JavaScript object literal
        // Remove trailing semicolon if present
        cleanedText = cleanedText.replace(/;$/, "");

        // Wrap in parentheses and evaluate
        const evaluated = eval(`(${cleanedText})`);
        validateAndImport(evaluated);
      }
    } catch (err) {
      console.error("GeoJSON parsing error:", err);
      if (err instanceof SyntaxError) {
        setError(
          `Invalid format: ${err.message}. Make sure property names are quoted (e.g., "type" not type)`
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to parse GeoJSON");
      }
    }
  };

  const validateAndImport = (parsed: any) => {
    // Validate GeoJSON structure
    if (!parsed.type) {
      throw new Error("Invalid GeoJSON: missing 'type' property");
    }

    if (parsed.type === "FeatureCollection") {
      if (!Array.isArray(parsed.features)) {
        throw new Error("Invalid GeoJSON: 'features' must be an array");
      }
    } else if (parsed.type === "Feature") {
      if (!parsed.geometry) {
        throw new Error("Invalid GeoJSON: missing 'geometry' property");
      }
    } else if (
      ![
        "Point",
        "LineString",
        "Polygon",
        "MultiPoint",
        "MultiLineString",
        "MultiPolygon",
        "GeometryCollection",
      ].includes(parsed.type)
    ) {
      throw new Error("Invalid GeoJSON: unsupported geometry type");
    }

    // Success - import the GeoJSON
    onImport(parsed, layerName.trim());

    // Reset form
    setGeojsonText("");
    setLayerName("");
    setIsExpanded(false);
    setError(null);
  };

  return (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
      >
        <span className="font-semibold text-blue-900 text-sm flex items-center gap-2">
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
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Import GeoJSON
        </span>
        <svg
          className={`w-4 h-4 text-blue-900 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Layer Name
            </label>
            <input
              type="text"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="e.g., My Custom Layer"
              className="w-full px-3 py-2 text-sm border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              GeoJSON Content
            </label>
            <textarea
              value={geojsonText}
              onChange={(e) => setGeojsonText(e.target.value)}
              placeholder='{"type":"FeatureCollection","features":[...]}'
              className="w-full px-3 py-2 text-sm text-gray-900 font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none placeholder:text-gray-400"
              rows={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste your GeoJSON or JavaScript object (with or without quotes)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
            >
              Import Layer
            </button>
            <button
              onClick={() => {
                setGeojsonText("");
                setLayerName("");
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
