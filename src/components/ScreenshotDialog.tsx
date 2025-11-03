import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ScreenshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl: string | null;
  onSubmit: (prompt: string) => void;
}

export function ScreenshotDialog({
  isOpen,
  onClose,
  screenshotUrl,
  onSubmit,
}: ScreenshotDialogProps) {
  const [prompt, setPrompt] = useState(
    "The attached picture is a 2d top-down city map of singapore, around a reservoir. Blue areas = water body (do not build here). Green areas = parks, generate a park map in those spaces. Grey areas = roads, leave those be. Generate me an city map for this image, by adding the 2d building footprints, filling in all the zones with designs of your own, for a mixed use urban project. in your output, roads must be grey, water must be blue. Buildings must be completely red with no black outline. Ensure that the areas closest to the water have buildings."
  );
  const [isLoading, setIsLoading] = useState(false);

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

      // Create download link
      const url = window.URL.createObjectURL(generatedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-map-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onSubmit(prompt);
      onClose();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl bg-white opacity-100'>
        <DialogHeader>
          <DialogTitle>Screenshot Captured</DialogTitle>
          <DialogDescription>
            Review your screenshot and provide instructions for AI generation
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          {screenshotUrl && (
            <div className='border rounded-lg overflow-hidden'>
              <img
                src={screenshotUrl}
                alt='Screenshot'
                className='w-full h-auto'
              />
            </div>
          )}
          <div className='space-y-2'>
            <label
              htmlFor='prompt'
              className='text-sm font-medium text-gray-700'
            >
              AI Prompt
            </label>
            <Textarea
              id='prompt'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Enter your prompt...'
              className='min-h-[100px]'
              disabled={isLoading}
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className='bg-green-600 hover:bg-green-700 text-white'
            >
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
