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
  const [prompt, setPrompt] = useState("generate me a city map");

  const handleSubmit = () => {
    onSubmit(prompt);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white opacity-100">
        <DialogHeader>
          <DialogTitle>Screenshot Captured</DialogTitle>
          <DialogDescription>
            Review your screenshot and provide instructions for AI generation
          </DialogDescription>
        </DialogHeader>
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
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Generate</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
