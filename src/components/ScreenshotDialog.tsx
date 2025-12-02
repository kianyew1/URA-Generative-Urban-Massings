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

const STYLE_PRESETS = [
  {
    id: "punggol",
    name: "Punggol style",
    image: "/styles/punggol.jpg",
    prompt:
      "Prompt:A top-down 2D architectural site plan map in a clean vector style. Water bodies are in blue, parks in green, roads and highways in grey. The empty white land areas between the roads and the green park buffer must be populated with a planned residential estate and roads. The buildings are represented as solid red silhouettes with no black outlines. The building shapes mimic complex high-density housing typologies: H-shaped blocks, linear slabs with stepped facades, and interconnected geometric clusters. The buildings are arranged logically to follow the curvature of the roads and the coastline. Flat colors, high contrast, architectural diagram aesthetic. Negative Prompt:black outlines, 3D, shadows, gradient, textured water, residential houses, realistic satellite view, buildings in the water, buildings on the roads, blue buildings, grey buildings.",
  },
  {
    id: "bedok",
    name: "Bedok south Segmented slab style",
    image: "/styles/bedok.jpg",
    prompt:
      "Prompt:A top-down 2D architectural site plan map in a clean vector style. Water bodies are in blue, parks in green, roads and highways in grey. The empty white land areas between the roads and the green park buffer must be populated with a planned residential estate and roads. The buildings are represented as solid red silhouettes with no black outlines. The building shapes mimic complex high-density housing typologies: H-shaped blocks, linear slabs with stepped facades, and interconnected geometric clusters. The buildings are arranged logically to follow the curvature of the roads and the coastline. Flat colors, high contrast, architectural diagram aesthetic. Negative Prompt:black outlines, 3D, shadows, gradient, textured water, residential houses, realistic satellite view, buildings in the water, buildings on the roads, blue buildings, grey buildings.",
  },
  {
    id: "queenstown",
    name: "Queenstown Dawson style",
    image: "/styles/queenstown.jpg",
    prompt:
      "Prompt:A top-down 2D architectural site plan map in a clean vector style. Water bodies are in blue, parks in green, roads and highways in grey. The empty white land areas between the roads and the green park buffer must be populated with a planned residential estate and roads. The buildings are represented as solid red silhouettes with no black outlines. The building shapes mimic complex high-density housing typologies in Queenstown Dawson, Singapore : Slim blocks with curved or tapered footprints, arranged in staggered parallel rows. Footprints emphasise slenderness and separation, producing high ventilation permeabilityNegative Prompt:black outlines, 3D, shadows, gradient, textured water, residential houses, realistic satellite view, buildings in the water, buildings on the roads, blue buildings, grey buildings.",
  },
  {
    id: "toapayoh",
    name: "Toa Payoh central courtyard style",
    image: "/styles/toapayoh.jpg",
    prompt:
      "Prompt:A top-down 2D architectural site plan map in a clean vector style. Water bodies are in blue, parks in green, roads and highways in grey. The empty white land areas between the roads and the green park buffer must be populated with a planned residential estate and roads. The buildings are represented as solid red silhouettes with no black outlines. The building shapes mimic complex high-density housing typologies in Queenstown Dawson, Singapore : Slim blocks with curved or tapered footprints, arranged in staggered parallel rows. Footprints emphasise slenderness and separation, producing high ventilation permeability Negative Prompt: black outlines, 3D, shadows, gradient, textured water, residential houses, realistic satellite view, buildings in the water, buildings on the roads, blue buildings, grey buildings.",
  },
];

export function ScreenshotDialog({
  isOpen,
  onClose,
  screenshotUrl,
  onSubmit,
  boundingBox,
  layerManager,
}: ScreenshotDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );
  const [api, setApi] = useState<CarouselApi>();

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImageUrl(null);
      setPrompt("");
      setSelectedStyle(null);
    }
  }, [isOpen]);

  // Move to second slide when image is generated
  useEffect(() => {
    if (generatedImageUrl && api) {
      api.scrollTo(1);
    }
  }, [generatedImageUrl, api]);

  const handleStyleSelect = (styleId: string) => {
    const style = STYLE_PRESETS.find((s) => s.id === styleId);
    if (style) {
      setPrompt(style.prompt);
      setSelectedStyle(styleId);
    }
  };

  const handleSubmit = async () => {
    if (!screenshotUrl) return;

    setIsLoading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(screenshotUrl);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append("image", blob, "screenshot.png");
      formData.append("prompt", prompt);

      // Send to API
      const apiResponse = await fetch("/api/nano_banana", {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        throw new Error("Failed to generate image");
      }

      // Get the generated image blob
      const generatedBlob = await apiResponse.blob();

      // Create object URL for display
      const url = window.URL.createObjectURL(generatedBlob);
      setGeneratedImageUrl(url);

      onSubmit(prompt);
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;

    try {
      // Convert the generated image URL to base64
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64Image = (reader.result as string).split(",")[1];

        // Create request payload for Python API
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

        // Use environment variable for API URL
        const apiUrl =
          process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

        // Send to Python API endpoint
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

        // Get the GeoJSON response
        const geojsonData = await apiResponse.json();

        // Add the GeoJSON as a new layer
        const layerId = `generated-buildings-${Date.now()}`;
        layerManager.addLayer({
          id: layerId,
          name: `Generated Buildings ${new Date().toLocaleTimeString()}`,
          visible: true,
          type: "geojson",
          data: geojsonData,
        });

        // Download the GeoJSON as a file
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

        // Close dialog and trigger re-render
        onClose();
      };
    } catch (error) {
      console.error("Error vectorising image:", error);
      alert("Failed to vectorise image. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] bg-white opacity-100 p-6 sm:max-w-[95vw]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {generatedImageUrl ? "Generated Result" : "Screenshot Captured"}
          </DialogTitle>
          <DialogDescription>
            {generatedImageUrl
              ? "Review your generated image"
              : "Select a style preset or provide custom instructions for AI generation"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
          {/* Style Presets Sidebar */}
          <div className="w-72 shrink-0 space-y-2 overflow-y-auto pr-2">
            <h3 className="font-semibold text-sm mb-3">Style Presets</h3>
            {STYLE_PRESETS.map((style) => (
              <button
                key={style.id}
                onClick={() => handleStyleSelect(style.id)}
                disabled={isLoading}
                className={cn(
                  "w-full p-3 border rounded-lg hover:border-green-500 transition-colors text-left",
                  selectedStyle === style.id
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

          {/* Main Content */}
          <div className="flex-1 overflow-hidden relative min-w-0">
            <Carousel setApi={setApi} className="w-full h-full">
              <CarouselContent>
                {/* Slide 1: Original Screenshot & Prompt */}
                <CarouselItem>
                  <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4 space-y-4">
                    {screenshotUrl && (
                      <div className="border rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={screenshotUrl}
                          alt="Screenshot"
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label
                        htmlFor="prompt"
                        className="text-sm font-medium text-gray-700"
                      >
                        AI Prompt
                      </label>
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Select a style preset or enter your custom prompt..."
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
                        onClick={handleSubmit}
                        disabled={isLoading || !prompt}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoading ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 2: Generated Image */}
                <CarouselItem>
                  <div className="h-[calc(90vh-180px)] overflow-y-auto pr-4 space-y-4">
                    {generatedImageUrl ? (
                      <>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={generatedImageUrl}
                            alt="Generated"
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-4 pb-2">
                          <Button variant="outline" onClick={onClose}>
                            Close
                          </Button>
                          <Button
                            onClick={handleDownload}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Download
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        {isLoading ? "Generating..." : "No image generated yet"}
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
