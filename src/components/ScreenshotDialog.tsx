import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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

// Step 2: Building generation presets (existing ones)
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

type GenerationStep = "road" | "building" | "final";

interface GeneratedImage {
  url: string;
  prompt: string;
  step: GenerationStep;
}

export function ScreenshotDialog({
  isOpen,
  onClose,
  screenshotUrl,
  onSubmit,
  boundingBox,
  layerManager,
}: ScreenshotDialogProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>("road");
  const [roadPrompt, setRoadPrompt] = useState("");
  const [buildingPrompt, setBuildingPrompt] = useState("");
  const [finalPrompt, setFinalPrompt] = useState("");
  const [selectedRoadStyle, setSelectedRoadStyle] = useState<string | null>(
    null
  );
  const [selectedBuildingStyle, setSelectedBuildingStyle] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{
    road: string | null;
    building: string | null;
    final: string | null;
  }>({
    road: null,
    building: null,
    final: null,
  });
  const [api, setApi] = useState<CarouselApi>();
  // Add this to your state initialization (around line 120)
  const [generatedBlobs, setGeneratedBlobs] = useState<{
    road: Blob | null;
    building: Blob | null;
  }>({
    road: null,
    building: null,
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up blob URLs when dialog closes
      setGeneratedImages((prev) => {
        if (prev.road) window.URL.revokeObjectURL(prev.road);
        if (prev.building) window.URL.revokeObjectURL(prev.building);
        return { road: null, building: null, final: null };
      });

      setCurrentStep("road");
      setGeneratedBlobs({ road: null, building: null });
      setRoadPrompt("");
      setBuildingPrompt("");
      setFinalPrompt("");
      setSelectedRoadStyle(null);
      setSelectedBuildingStyle(null);
    }
  }, [isOpen]);

  // Auto-scroll carousel based on step
  useEffect(() => {
    if (!api) return;

    if (currentStep === "road") {
      api.scrollTo(0);
    } else if (currentStep === "building" && generatedImages.road) {
      api.scrollTo(1);
    } else if (currentStep === "final" && generatedImages.building) {
      api.scrollTo(2);
    }
  }, [currentStep, generatedImages, api]);

  const handleRoadStyleSelect = (styleId: string) => {
    const style = ROAD_STYLE_PRESETS.find((s) => s.id === styleId);
    if (style) {
      setRoadPrompt(style.prompt);
      setSelectedRoadStyle(styleId);
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
    // Don't revoke the URL immediately - keep it for display
    // It will be cleaned up when the dialog closes
  };

  // Update handleGenerateRoad to store the blob:
  const handleGenerateRoad = async () => {
    if (!screenshotUrl || !roadPrompt) return;

    setIsLoading(true);
    try {
      const { url, blob } = await generateImage(screenshotUrl, roadPrompt);
      setGeneratedImages((prev) => ({ ...prev, road: url }));
      setGeneratedBlobs((prev) => ({ ...prev, road: blob }));

      // Download the road image - pass blob instead of url
      downloadImage(blob, `road-network-${Date.now()}.png`);

      setCurrentStep("building");
    } catch (error) {
      console.error("Error generating road network:", error);
      alert("Failed to generate road network. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBuildings = async () => {
    if (!generatedBlobs.road || !buildingPrompt) return;

    setIsLoading(true);
    try {
      // Convert blob back to URL for generateImage function
      const roadUrl = window.URL.createObjectURL(generatedBlobs.road);
      const { url, blob } = await generateImage(roadUrl, buildingPrompt);
      window.URL.revokeObjectURL(roadUrl); // Clean up temp URL

      setGeneratedImages((prev) => ({ ...prev, building: url }));
      setGeneratedBlobs((prev) => ({ ...prev, building: blob }));

      // Download the buildings image - pass blob instead of url
      downloadImage(blob, `buildings-${Date.now()}.png`);

      // Set final prompt as combination
      setFinalPrompt(
        `Step 1 - Roads:\n${roadPrompt}\n\nStep 2 - Buildings:\n${buildingPrompt}`
      );
      setCurrentStep("final");
    } catch (error) {
      console.error("Error generating buildings:", error);
      alert("Failed to generate buildings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVectoriseAndClose = async () => {
    if (!generatedBlobs.building) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(generatedBlobs.building);

      reader.onloadend = async () => {
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

        onSubmit(finalPrompt);
        onClose();
      };
    } catch (error) {
      console.error("Error vectorising image:", error);
      alert("Failed to vectorise image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateRoad = () => {
    setGeneratedImages({ road: null, building: null, final: null });
    setCurrentStep("road");
    setSelectedBuildingStyle(null);
    setBuildingPrompt("");
    setFinalPrompt("");
  };

  const handleRegenerateBuildings = () => {
    setGeneratedImages((prev) => ({ ...prev, building: null, final: null }));
    setCurrentStep("building");
    setFinalPrompt("");
  };

  const getCurrentPresets = () => {
    return currentStep === "road" ? ROAD_STYLE_PRESETS : BUILDING_STYLE_PRESETS;
  };

  const getCurrentPrompt = () => {
    if (currentStep === "road") return roadPrompt;
    if (currentStep === "building") return buildingPrompt;
    return finalPrompt;
  };

  const getCurrentSelectedStyle = () => {
    return currentStep === "road" ? selectedRoadStyle : selectedBuildingStyle;
  };

  const handleStyleSelect = (styleId: string) => {
    if (currentStep === "road") {
      handleRoadStyleSelect(styleId);
    } else if (currentStep === "building") {
      handleBuildingStyleSelect(styleId);
    }
  };

  const handlePromptChange = (value: string) => {
    if (currentStep === "road") {
      setRoadPrompt(value);
    } else if (currentStep === "building") {
      setBuildingPrompt(value);
    } else {
      setFinalPrompt(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] bg-white opacity-100 p-6 sm:max-w-[95vw]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {currentStep === "road" && "Step 1: Generate Road Network"}
            {currentStep === "building" && "Step 2: Generate Buildings"}
            {currentStep === "final" && "Step 3: Final Result"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === "road" &&
              "First, generate the road network for your site"}
            {currentStep === "building" &&
              "Now add buildings to your road network"}
            {currentStep === "final" &&
              "Review your complete site plan. All images have been downloaded."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
          {/* Style Presets Sidebar - only show in road and building steps */}
          {currentStep !== "final" && (
            <div className="w-72 shrink-0 space-y-2 overflow-y-auto pr-2">
              <h3 className="font-semibold text-sm mb-3">Style Presets</h3>
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
                    <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                      <img
                        src={style.image}
                        alt={style.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium">{style.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-hidden relative min-w-0">
            <Carousel setApi={setApi} className="w-full h-full">
              <CarouselContent>
                {/* Slide 1: Original Screenshot & Road Prompt */}
                <CarouselItem>
                  <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4 space-y-4">
                    {screenshotUrl && (
                      <div className="border rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={screenshotUrl}
                          alt="Base Map"
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label
                        htmlFor="road-prompt"
                        className="text-sm font-medium text-gray-700"
                      >
                        Road Network Generation Prompt
                      </label>
                      <Textarea
                        id="road-prompt"
                        value={roadPrompt}
                        onChange={(e) => setRoadPrompt(e.target.value)}
                        placeholder="Select a road style preset or enter your custom prompt..."
                        className="min-h-[120px]"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-4 pb-2">
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
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 2: Generated Road Network & Building Prompt */}
                <CarouselItem>
                  <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4 space-y-4">
                    {generatedImages.road ? (
                      <>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={generatedImages.road}
                            alt="Generated Road Network"
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="building-prompt"
                            className="text-sm font-medium text-gray-700"
                          >
                            Building Generation Prompt
                          </label>
                          <Textarea
                            id="building-prompt"
                            value={buildingPrompt}
                            onChange={(e) => setBuildingPrompt(e.target.value)}
                            placeholder="Select a building style preset or enter your custom prompt..."
                            className="min-h-[120px]"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-4 pb-2">
                          <Button
                            variant="outline"
                            onClick={handleRegenerateRoad}
                            disabled={isLoading}
                          >
                            Regenerate Roads
                          </Button>
                          <Button
                            onClick={handleGenerateBuildings}
                            disabled={isLoading || !buildingPrompt}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isLoading ? "Generating..." : "Generate Buildings"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        {isLoading
                          ? "Generating road network..."
                          : "No road network generated yet"}
                      </div>
                    )}
                  </div>
                </CarouselItem>

                {/* Slide 3: Final Result with Combined Prompt */}
                <CarouselItem>
                  <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4 space-y-4">
                    {generatedImages.building ? (
                      <>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={generatedImages.building}
                            alt="Final Site Plan"
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="final-prompt"
                            className="text-sm font-medium text-gray-700"
                          >
                            Complete Generation Prompts
                          </label>
                          <Textarea
                            id="final-prompt"
                            value={finalPrompt}
                            readOnly
                            className="min-h-[200px] bg-gray-50"
                          />
                        </div>
                        <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-4 pb-2">
                          <Button
                            variant="outline"
                            onClick={handleRegenerateBuildings}
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
                            onClick={handleVectoriseAndClose}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isLoading
                              ? "Vectorising..."
                              : "Vectorise & Add to Map"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        {isLoading
                          ? "Generating buildings..."
                          : "No buildings generated yet"}
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
