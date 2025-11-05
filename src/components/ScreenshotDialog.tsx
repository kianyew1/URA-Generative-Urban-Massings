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

interface ScreenshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl: string | null;
  onSubmit: (prompt: string) => void;
  boundingBox: any;
  layerManager: any;
}

export function ScreenshotDialog({
  isOpen,
  onClose,
  screenshotUrl,
  onSubmit,
  boundingBox,
  layerManager,
}: ScreenshotDialogProps) {
  const [prompt, setPrompt] = useState(
    "The attached picture is a 2d top-down city map of singapore, around a reservoir. Blue areas = water body (do not build here). Green areas = parks, generate a park map in those spaces. Grey areas = roads, leave those be. Generate me an city map for this image, by adding the 2d building footprints, filling in all the zones with designs of your own, for a mixed use urban project. in your output, roads must be grey, water must be blue. Buildings must be completely red with no black outline. Ensure that the areas closest to the water have buildings."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );
  const [api, setApi] = useState<CarouselApi>();

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImageUrl(null);
      setPrompt(
        "The attached picture is a 2d top-down city map of singapore, around a reservoir. Blue areas = water body (do not build here). Green areas = parks, generate a park map in those spaces. Grey areas = roads, leave those be. Generate me an city map for this image, by adding the 2d building footprints, filling in all the zones with designs of your own, for a mixed use urban project. in your output, roads must be grey, water must be blue. Buildings must be completely red with no black outline. Ensure that the areas closest to the water have buildings."
      );
    }
  }, [isOpen]);

  // Move to second slide when image is generated
  useEffect(() => {
    if (generatedImageUrl && api) {
      api.scrollTo(1);
    }
  }, [generatedImageUrl, api]);

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

        // Send to Python API endpoint - FIX THE PATH
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
      <DialogContent className="max-w-4xl bg-white opacity-100">
        <DialogHeader>
          <DialogTitle>
            {generatedImageUrl ? "Generated Result" : "Screenshot Captured"}
          </DialogTitle>
          <DialogDescription>
            {generatedImageUrl
              ? "Review your generated image"
              : "Review your screenshot and provide instructions for AI generation"}
          </DialogDescription>
        </DialogHeader>

        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {/* Slide 1: Original Screenshot & Prompt */}
            <CarouselItem>
              <div className="space-y-4">
                {screenshotUrl && (
                  <div className="border rounded-lg overflow-hidden">
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
                    placeholder="Enter your prompt..."
                    className="min-h-[100px]"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            </CarouselItem>

            {/* Slide 2: Generated Image */}
            <CarouselItem>
              <div className="space-y-4">
                {generatedImageUrl ? (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <img
                        src={generatedImageUrl}
                        alt="Generated"
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
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
                  <div className="flex items-center justify-center h-96 text-gray-400">
                    {isLoading ? "Generating..." : "No image generated yet"}
                  </div>
                )}
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
