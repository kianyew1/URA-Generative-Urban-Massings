import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ScreenshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl: string | null;
  onSubmit: (prompt: string) => void;
  boundingBox: any;
  layerManager: any;
}

// Step 1: Road generation presets
const ROAD_STYLE_PRESETS = [
  {
    id: "organic",
    name: "Organic Road Network",
    image: "/styles/road_organic.jpg",
    prompt:
      "Prompt: A top-down 2D site plan showing only a road network. Water bodies are in blue, existing parks in green. The empty white land areas must be filled with a curvilinear organic road network in grey. Roads follow natural topography with smooth curves and flowing intersections. Primary arterial roads are wider, secondary roads branch organically. No buildings, only roads. Clean vector style, flat colors. Negative Prompt: buildings, 3D, shadows, straight grid, rigid geometry, Manhattan grid.",
  },
  {
    id: "grid",
    name: "Grid Road Network",
    image: "/styles/road_grid.jpg",
    prompt:
      "Prompt: A top-down 2D site plan showing only a road network. Water bodies are in blue, existing parks in green. The empty white land areas must be filled with an orthogonal grid road network in grey. Roads form a regular grid pattern with perpendicular intersections. Primary roads run north-south and east-west. No buildings, only roads. Clean vector style, flat colors. Negative Prompt: buildings, 3D, shadows, curves, organic shapes, diagonal roads.",
  },
  {
    id: "radial",
    name: "Radial Road Network",
    image: "/styles/road_radial.jpg",
    prompt:
      "Prompt: A top-down 2D site plan showing only a road network. Water bodies are in blue, existing parks in green. The empty white land areas must be filled with a radial road network in grey. Roads radiate from central points with concentric circular or arc roads connecting them. Mix of radial and ring roads. No buildings, only roads. Clean vector style, flat colors. Negative Prompt: buildings, 3D, shadows, pure grid, random placement.",
  },
];

// Step 2: Parcelisation presets
const PARCELISATION_PRESETS = [
  {
    id: "default",
    name: "Standard Zoning",
    image: "/styles/parcelisation_default.jpg",
    prompt:
      "Top-down 2D vector site plan. Blue = water. Convert ONLY the white empty areas that directly touch the blue water into green landscape. No other areas should be green. Roads and highways remain grey. For all other white empty land areas fully bounded by roads (and not touching water), apply land-use zoning by recoloring the ground plane itself: 70% of the area becomes a Red Zone (Residential land-use) 30% of the area becomes a Yellow Zone (Commercial land-use) Do not populate zones with buildings. Negative Prompt: black outlines, 3D, shadows, gradients, textured water, satellite realism, buildings in water, buildings on roads, multi-colored buildings.",
  },
];

// Step 2 Alternative: Building generation presets (zero-shot method)
const BUILDING_STYLE_PRESETS = [
  {
    id: "punggol",
    name: "Punggol style",
    image: "/styles/punggol.jpg",
    prompt:
      "Prompt: A top-down 2D architectural site plan with the existing road network in grey, water in blue, and parks in green. The empty white land areas between roads must be populated with residential buildings shown as solid red silhouettes with no black outlines. Buildings are H-shaped blocks, linear slabs with stepped facades, and interconnected geometric clusters arranged to follow road curvature. High-density housing. Flat colors, architectural diagram aesthetic. Negative Prompt: black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings.",
  },
  {
    id: "bedok",
    name: "Bedok South Segmented Slab",
    image: "/styles/bedok.jpg",
    prompt:
      "Prompt: A top-down 2D architectural site plan with the existing road network in grey, water in blue, and parks in green. The empty white land areas between roads must be populated with residential buildings shown as solid red silhouettes with no black outlines. Buildings are rectilinear slab blocks forming U- and L-shaped enclosures. Modular, mid-rise footprints with consistent grid geometry, placed orthogonally. Classic HDB pattern. Flat colors. Negative Prompt: black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings.",
  },
  {
    id: "queenstown",
    name: "Queenstown Dawson",
    image: "/styles/queenstown.jpg",
    prompt:
      "Prompt: A top-down 2D architectural site plan with the existing road network in grey, water in blue, and parks in green. The empty white land areas between roads must be populated with residential buildings shown as solid red silhouettes with no black outlines. Buildings are slim blocks with curved or tapered footprints, arranged in staggered parallel rows emphasizing slenderness and separation. High ventilation permeability. Flat colors. Negative Prompt: black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings.",
  },
  {
    id: "toapayoh",
    name: "Toa Payoh Central Courtyard",
    image: "/styles/toapayoh.jpg",
    prompt:
      "Prompt: A top-down 2D architectural site plan with the existing road network in grey, water in blue, and parks in green. The empty white land areas between roads must be populated with residential buildings shown as solid red silhouettes with no black outlines. Buildings are long rectilinear slabs broken into articulated segments with rhythmic sawtooth setbacks. Follow sweeping arcs shaped by coastal alignments. Semi-open clusters with wide green buffers. Flat colors. Negative Prompt: black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings.",
  },
];

type GenerationStep = "road" | "parcelisation" | "building";
type GenerationMethod = "parcel-based" | "zero-shot";

export function ScreenshotDialog({
  isOpen,
  onClose,
  screenshotUrl,
  onSubmit,
  boundingBox,
  layerManager,
}: ScreenshotDialogProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>("road");
  const [generationMethod, setGenerationMethod] =
    useState<GenerationMethod>("parcel-based");
  const [roadPrompt, setRoadPrompt] = useState("");
  const [parcelisationPrompt, setParcelisationPrompt] = useState("");
  const [buildingPrompt, setBuildingPrompt] = useState("");
  const [selectedRoadStyle, setSelectedRoadStyle] = useState<string | null>(
    null
  );
  const [selectedParcelisationStyle, setSelectedParcelisationStyle] = useState<
    string | null
  >(null);
  const [selectedBuildingStyle, setSelectedBuildingStyle] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{
    road: string | null;
    parcelisation: string | null;
    building: string | null;
  }>({
    road: null,
    parcelisation: null,
    building: null,
  });
  const [api, setApi] = useState<CarouselApi>();
  const [generatedBlobs, setGeneratedBlobs] = useState<{
    road: Blob | null;
    parcelisation: Blob | null;
    building: Blob | null;
  }>({
    road: null,
    parcelisation: null,
    building: null,
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up blob URLs when dialog closes
      setGeneratedImages((prev) => {
        if (prev.road) window.URL.revokeObjectURL(prev.road);
        if (prev.parcelisation) window.URL.revokeObjectURL(prev.parcelisation);
        if (prev.building) window.URL.revokeObjectURL(prev.building);
        return { road: null, parcelisation: null, building: null };
      });

      setCurrentStep("road");
      setGenerationMethod("parcel-based");
      setGeneratedBlobs({ road: null, parcelisation: null, building: null });
      setRoadPrompt("");
      setParcelisationPrompt("");
      setBuildingPrompt("");
      setSelectedRoadStyle(null);
      setSelectedParcelisationStyle(null);
      setSelectedBuildingStyle(null);
    }
  }, [isOpen]);

  // Auto-scroll carousel based on step
  useEffect(() => {
    if (!api) return;

    if (currentStep === "road") {
      api.scrollTo(0);
    } else if (currentStep === "parcelisation" && generatedImages.road) {
      api.scrollTo(1);
    } else if (currentStep === "building") {
      // For both zero-shot and parcel-based, show the result on slide 3
      if (generatedImages.building || generatedImages.parcelisation) {
        api.scrollTo(2);
      }
    }
  }, [currentStep, generatedImages, api]);

  // Sync currentStep with carousel position
  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      if (selectedIndex === 0) {
        setCurrentStep("road");
      } else if (selectedIndex === 1 && generatedImages.road) {
        setCurrentStep("parcelisation");
      } else if (selectedIndex === 2) {
        if (generatedImages.parcelisation || generatedImages.building) {
          setCurrentStep("building");
        }
      }
    };

    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api, generatedImages]);

  const handleRoadStyleSelect = (styleId: string) => {
    const style = ROAD_STYLE_PRESETS.find((s) => s.id === styleId);
    if (style) {
      setRoadPrompt(style.prompt);
      setSelectedRoadStyle(styleId);
    }
  };

  const handleParcelisationStyleSelect = (styleId: string) => {
    const style = PARCELISATION_PRESETS.find((s) => s.id === styleId);
    if (style) {
      setParcelisationPrompt(style.prompt);
      setSelectedParcelisationStyle(styleId);
    }
  };

  const handleBuildingStyleSelect = (styleId: string) => {
    const style = BUILDING_STYLE_PRESETS.find((s) => s.id === styleId);
    if (style) {
      setBuildingPrompt(style.prompt);
      setSelectedBuildingStyle(styleId);
    }
  };

  const generateImage = async (
    baseImageUrl: string,
    prompt: string
  ): Promise<{ url: string; blob: Blob }> => {
    const response = await fetch(baseImageUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("image", blob, "screenshot.png");
    formData.append("prompt", prompt);

    const apiResponse = await fetch("/api/nano_banana", {
      method: "POST",
      body: formData,
    });

    if (!apiResponse.ok) {
      throw new Error("Failed to generate image");
    }

    const generatedBlob = await apiResponse.blob();
    const url = window.URL.createObjectURL(generatedBlob);

    return { url, blob: generatedBlob };
  };

  const downloadImage = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateRoad = async () => {
    if (!screenshotUrl || !roadPrompt) return;

    setIsLoading(true);
    try {
      const { url, blob } = await generateImage(screenshotUrl, roadPrompt);
      setGeneratedImages((prev) => ({ ...prev, road: url }));
      setGeneratedBlobs((prev) => ({ ...prev, road: blob }));

      downloadImage(blob, `road-network-${Date.now()}.png`);

      setCurrentStep("parcelisation");
    } catch (error) {
      console.error("Error generating road network:", error);
      alert("Failed to generate road network. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateParcelisation = async () => {
    if (!generatedBlobs.road || !parcelisationPrompt) return;

    setIsLoading(true);
    try {
      const roadUrl = window.URL.createObjectURL(generatedBlobs.road);
      const { url, blob } = await generateImage(roadUrl, parcelisationPrompt);
      window.URL.revokeObjectURL(roadUrl);

      setGeneratedImages((prev) => ({ ...prev, parcelisation: url }));
      setGeneratedBlobs((prev) => ({ ...prev, parcelisation: blob }));

      downloadImage(blob, `parcelisation-${Date.now()}.png`);

      setCurrentStep("building");
    } catch (error) {
      console.error("Error generating parcelisation:", error);
      alert("Failed to generate parcelisation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateZeroShotBuildings = async () => {
    if (!generatedBlobs.road || !buildingPrompt) return;

    setIsLoading(true);
    try {
      const roadUrl = window.URL.createObjectURL(generatedBlobs.road);
      const { url, blob } = await generateImage(roadUrl, buildingPrompt);
      window.URL.revokeObjectURL(roadUrl);

      setGeneratedImages((prev) => ({ ...prev, building: url }));
      setGeneratedBlobs((prev) => ({ ...prev, building: blob }));

      downloadImage(blob, `buildings-${Date.now()}.png`);

      // Move to building step to show result and give user add to map option
      setCurrentStep("building");
    } catch (error) {
      console.error("Error generating buildings:", error);
      alert("Failed to generate buildings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAndAddBuildings = async () => {
    if (!generatedBlobs.parcelisation) return;

    setIsLoading(true);
    try {
      // TODO: Implement building footprint generation logic here
      // This function should:
      // 1. Generate the building image using the parcelisation image
      // 2. Vectorise the building image
      // 3. Add the GeoJSON to the map
      // 4. Download the vectorised GeoJSON

      console.log("Building generation logic to be implemented");
      alert("Building generation logic is not yet implemented.");
    } catch (error) {
      console.error("Error generating buildings:", error);
      alert("Failed to generate buildings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZeroShotBuildingsToMap = async () => {
    if (!generatedBlobs.building) return;

    setIsLoading(true);
    try {
      await vectoriseAndAddToMap(generatedBlobs.building);
      onClose();
    } catch (error) {
      console.error("Error adding buildings to map:", error);
      alert("Failed to add buildings to map. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const vectoriseAndAddToMap = async (imageBlob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageBlob);

    return new Promise<void>((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64Image = (reader.result as string).split(",")[1];

          const requestBody = {
            image: base64Image,
            bbox: boundingBox,
            use_mix: [0.7, 0.2, 0.1],
            density: [
              [25, 35],
              [4, 9],
              [10, 20],
            ],
            sigma: 30,
            falloff_k: 1,
            w_threshold: 200,
            b_threshold: 170,
            simplify_tolerance: 5.0,
            min_area_ratio: 0.0001,
          };

          const apiUrl =
            process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

          const apiResponse = await fetch(`${apiUrl}/api/py/vectorise`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (!apiResponse.ok) {
            throw new Error("Failed to vectorise image");
          }

          const geojsonData = await apiResponse.json();

          const layerId = `generated-buildings-${Date.now()}`;
          layerManager.addLayer({
            id: layerId,
            name: `Generated Buildings ${new Date().toLocaleTimeString()}`,
            visible: true,
            type: "geojson",
            data: geojsonData,
          });

          const geojsonBlob = new Blob([JSON.stringify(geojsonData, null, 2)], {
            type: "application/json",
          });
          const geojsonUrl = window.URL.createObjectURL(geojsonBlob);

          const a = document.createElement("a");
          a.href = geojsonUrl;
          a.download = `vectorised-buildings-${Date.now()}.geojson`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(geojsonUrl);
          document.body.removeChild(a);

          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image blob"));
    });
  };

  const handleRegenerateRoad = () => {
    setGeneratedImages({ road: null, parcelisation: null, building: null });
    setCurrentStep("road");
    setSelectedParcelisationStyle(null);
    setParcelisationPrompt("");
  };

  const handleRegenerateParcelisation = () => {
    setGeneratedImages((prev) => ({
      ...prev,
      parcelisation: null,
      building: null,
    }));
    setCurrentStep("parcelisation");
  };

  const handleRegenerateZeroShotBuildings = () => {
    setGeneratedImages((prev) => ({ ...prev, building: null }));
    setGeneratedBlobs((prev) => ({ ...prev, building: null }));
    setCurrentStep("parcelisation");
  };

  const getCurrentPresets = () => {
    if (currentStep === "road") return ROAD_STYLE_PRESETS;
    if (currentStep === "parcelisation") {
      return generationMethod === "parcel-based"
        ? PARCELISATION_PRESETS
        : BUILDING_STYLE_PRESETS;
    }
    return [];
  };

  const getCurrentPrompt = () => {
    if (currentStep === "road") return roadPrompt;
    if (currentStep === "parcelisation") {
      return generationMethod === "parcel-based"
        ? parcelisationPrompt
        : buildingPrompt;
    }
    return buildingPrompt;
  };

  const getCurrentSelectedStyle = () => {
    if (currentStep === "road") return selectedRoadStyle;
    if (currentStep === "parcelisation") {
      return generationMethod === "parcel-based"
        ? selectedParcelisationStyle
        : selectedBuildingStyle;
    }
    return null;
  };

  const handleStyleSelect = (styleId: string) => {
    if (currentStep === "road") {
      handleRoadStyleSelect(styleId);
    } else if (currentStep === "parcelisation") {
      if (generationMethod === "parcel-based") {
        handleParcelisationStyleSelect(styleId);
      } else {
        handleBuildingStyleSelect(styleId);
      }
    }
  };

  const handlePromptChange = (value: string) => {
    if (currentStep === "road") {
      setRoadPrompt(value);
    } else if (currentStep === "parcelisation") {
      setParcelisationPrompt(value);
    } else {
      setBuildingPrompt(value);
    }
  };

  const getStepTitle = () => {
    if (currentStep === "road") return "Step 1: Generate Road Network";
    if (currentStep === "parcelisation") {
      return generationMethod === "parcel-based"
        ? "Step 2: Generate Parcelisation"
        : "Step 2: Generate Buildings";
    }
    return generationMethod === "parcel-based"
      ? "Step 3: Generate Buildings"
      : "Step 3: Add Buildings to Map";
  };

  const getStepDescription = () => {
    if (currentStep === "road")
      return "First, generate the road network for your site";
    if (currentStep === "parcelisation") {
      return generationMethod === "parcel-based"
        ? "Now generate land-use parcels based on the road network"
        : "Generate buildings directly from the road network";
    }
    return generationMethod === "parcel-based"
      ? "Finally, generate building footprints and add them to the map"
      : "Review the generated buildings and add them to the map";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] bg-white opacity-100 p-0 sm:max-w-[95vw] overflow-hidden">
        {/* 2-Column Layout */}
        <div className="flex h-full overflow-hidden">
          {/* Left Column: Controls */}
          <div className="w-[40%] flex flex-col border-r border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <DialogTitle className="text-xl font-semibold mb-2">
                {getStepTitle()}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {getStepDescription()}
              </DialogDescription>
            </div>

            {/* Method Toggle - only show in Step 2 (parcelisation step) */}
            {currentStep === "parcelisation" && generatedImages.road && (
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    Choose Method:
                  </span>
                  <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white">
                    <button
                      onClick={() => setGenerationMethod("parcel-based")}
                      disabled={isLoading}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        generationMethod === "parcel-based"
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Parcel-Based
                    </button>
                    <button
                      onClick={() => setGenerationMethod("zero-shot")}
                      disabled={isLoading}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        generationMethod === "zero-shot"
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Zero-Shot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Style Presets - only show in road and parcelisation steps */}
              {currentStep !== "building" && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Style Presets</h3>
                  <div className="space-y-2">
                    {getCurrentPresets().map((style) => (
                      <button
                        key={style.id}
                        onClick={() => handleStyleSelect(style.id)}
                        disabled={isLoading}
                        className={cn(
                          "w-full p-3 border rounded-lg hover:border-green-500 transition-colors text-left",
                          getCurrentSelectedStyle() === style.id
                            ? "border-green-600 bg-green-50"
                            : "border-gray-200"
                        )}
                      >
                        <div className="flex gap-3 items-center">
                          <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                            <img
                              src={style.image}
                              alt={style.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                          <div className="text-sm font-medium">
                            {style.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Textarea */}
              <div className="space-y-2">
                <label
                  htmlFor="prompt-textarea"
                  className="text-sm font-medium text-gray-700"
                >
                  {currentStep === "road" && "Road Network Generation Prompt"}
                  {currentStep === "parcelisation" &&
                    generationMethod === "parcel-based" &&
                    "Parcelisation Prompt"}
                  {currentStep === "parcelisation" &&
                    generationMethod === "zero-shot" &&
                    "Building Generation Prompt"}
                  {currentStep === "building" && "Building Generation"}
                </label>
                {currentStep === "building" ? (
                  <p className="text-sm text-gray-600">
                    Click the button below to generate building footprints from
                    the parcelisation and add them to the map.
                  </p>
                ) : (
                  <Textarea
                    id="prompt-textarea"
                    value={getCurrentPrompt()}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    placeholder="Select a style preset or enter your custom prompt..."
                    className="min-h-[200px] resize-none"
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end gap-2">
                {currentStep === "road" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateRoad}
                      disabled={isLoading || !roadPrompt}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isLoading ? "Generating..." : "Generate Roads"}
                    </Button>
                  </>
                )}
                {currentStep === "parcelisation" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateRoad}
                      disabled={isLoading}
                    >
                      Regenerate Roads
                    </Button>
                    {generationMethod === "parcel-based" ? (
                      <Button
                        onClick={handleGenerateParcelisation}
                        disabled={isLoading || !parcelisationPrompt}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoading ? "Generating..." : "Generate Parcelisation"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleGenerateZeroShotBuildings}
                        disabled={isLoading || !buildingPrompt}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoading ? "Generating..." : "Generate Buildings"}
                      </Button>
                    )}
                  </>
                )}
                {currentStep === "building" && (
                  <>
                    {generationMethod === "parcel-based" ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleRegenerateParcelisation}
                          disabled={isLoading}
                        >
                          Regenerate Parcelisation
                        </Button>
                        <Button
                          variant="outline"
                          onClick={onClose}
                          disabled={isLoading}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={handleGenerateAndAddBuildings}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLoading
                            ? "Generating..."
                            : "Generate & Add Buildings"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleRegenerateZeroShotBuildings}
                          disabled={isLoading}
                        >
                          Regenerate Buildings
                        </Button>
                        <Button
                          variant="outline"
                          onClick={onClose}
                          disabled={isLoading}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={handleAddZeroShotBuildingsToMap}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLoading ? "Adding..." : "Add to Map"}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Carousel Image Display */}
          <div className="w-[60%] bg-gray-50 relative flex items-center justify-center overflow-hidden">
            <Carousel setApi={setApi} className="">
              <CarouselContent className="h-full">
                {/* Slide 1: Original Screenshot */}
                <CarouselItem className="h-full flex items-center justify-center">
                  <div className="w-full h-full flex items-center justify-center px-16 py-6">
                    {screenshotUrl ? (
                      <img
                        src={screenshotUrl}
                        alt="Base Map"
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <div className="text-lg font-medium">
                          No image available
                        </div>
                        <div className="text-sm">
                          Take a screenshot to begin
                        </div>
                      </div>
                    )}
                  </div>
                </CarouselItem>

                {/* Slide 2: Generated Road Network */}
                <CarouselItem className="h-full flex items-center justify-center">
                  <div className="w-full h-full flex items-center justify-center px-16 py-6">
                    {generatedImages.road ? (
                      <img
                        src={generatedImages.road}
                        alt="Generated Road Network"
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        {isLoading ? (
                          <>
                            <div className="text-lg font-medium">
                              Generating...
                            </div>
                            <div className="text-sm">Creating road network</div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-medium">
                              No road network generated yet
                            </div>
                            <div className="text-sm">
                              Generate roads from Step 1
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CarouselItem>

                {/* Slide 3: Generated Parcelisation or Buildings (depending on method) */}
                <CarouselItem className="h-full flex items-center justify-center">
                  <div className="w-full h-full flex items-center justify-center px-16 py-6">
                    {generationMethod === "parcel-based" &&
                    generatedImages.parcelisation ? (
                      <img
                        src={generatedImages.parcelisation}
                        alt="Generated Parcelisation"
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg"
                      />
                    ) : generationMethod === "zero-shot" &&
                      generatedImages.building ? (
                      <img
                        src={generatedImages.building}
                        alt="Generated Buildings"
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        {isLoading ? (
                          <>
                            <div className="text-lg font-medium">
                              Generating...
                            </div>
                            <div className="text-sm">
                              {generationMethod === "parcel-based"
                                ? "Creating parcelisation"
                                : "Creating buildings"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-medium">
                              {generationMethod === "parcel-based"
                                ? "No parcelisation generated yet"
                                : "No buildings generated yet"}
                            </div>
                            <div className="text-sm">
                              {generationMethod === "parcel-based"
                                ? "Generate parcelisation from Step 2"
                                : "Generate buildings from Step 2"}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
