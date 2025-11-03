import { useState, useCallback, useMemo, useRef } from "react";
import { ScreenshotWidget } from "@deck.gl/widgets";
import { LayerManager } from "../LayerManager";

interface UseScreenshotProps {
  layerManager: LayerManager;
  deckRef: React.RefObject<any>;
  mapRef: React.RefObject<any>;
  setLayerRevision: React.Dispatch<React.SetStateAction<number>>;
}

export function useScreenshot({
  layerManager,
  deckRef,
  mapRef,
  setLayerRevision,
}: UseScreenshotProps) {
  const [pendingScreenshotLayerId, setPendingScreenshotLayerId] = useState<
    string | null
  >(null);
  const screenshotDataUrlRef = useRef<string | null>(null);

  const handleCustomScreenshot = useCallback(
    (widget: ScreenshotWidget) => {
      if (!pendingScreenshotLayerId || !deckRef.current || !mapRef.current) {
        // If no pending screenshot, just use default behavior
        const dataURL = widget.captureScreenToDataURL(widget.props.imageFormat);
        if (dataURL) {
          widget.downloadDataURL(dataURL, widget.props.filename);
        }
        return;
      }

      const layer = layerManager.getLayer(pendingScreenshotLayerId);
      if (!layer?.bounds) return;

      const deck = deckRef.current.deck;
      const map = mapRef.current.getMap();

      if (!deck || !map) return;

      const { minLng, maxLng, minLat, maxLat } = layer.bounds;
      const padding = 0;

      // Get the viewport
      const viewport = deck.getViewports()[0];

      // Project the bounds to get pixel coordinates (viewport.project returns CSS pixels)
      const nw = viewport.project([minLng, maxLat]);
      const se = viewport.project([maxLng, minLat]);
      const ne = viewport.project([maxLng, maxLat]);
      const sw = viewport.project([minLng, minLat]);

      const minX = Math.min(nw[0], se[0], ne[0], sw[0]);
      const maxX = Math.max(nw[0], se[0], ne[0], sw[0]);
      const minY = Math.min(nw[1], se[1], ne[1], sw[1]);
      const maxY = Math.max(nw[1], se[1], ne[1], sw[1]);

      const width = maxX - minX;
      const height = maxY - minY;

      // Get both canvases
      const deckCanvas = deck.canvas;
      const mapCanvas = map.getCanvas();

      // Device pixel ratio
      const dpr = window.devicePixelRatio || 1;

      // Output size in CSS pixels
      const outputWidth = Math.round(width + padding * 2);
      const outputHeight = Math.round(height + padding * 2);

      // Create high-res canvas (internal pixels = css * dpr)
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(outputWidth * dpr);
      cropCanvas.height = Math.round(outputHeight * dpr);
      cropCanvas.style.width = `${outputWidth}px`;
      cropCanvas.style.height = `${outputHeight}px`;

      const ctx = cropCanvas.getContext("2d", {
        willReadFrequently: false,
        alpha: false,
      });

      if (ctx && deckCanvas && mapCanvas) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // White background (fill in device pixels)
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

        // Source coords: viewport.project returns CSS px, so multiply by dpr to get canvas pixels
        const sx = Math.round((minX - padding) * dpr);
        const sy = Math.round((minY - padding) * dpr);
        const sWidth = Math.round((width + padding * 2) * dpr);
        const sHeight = Math.round((height + padding * 2) * dpr);

        // Destination is the full high-res canvas
        const dx = 0;
        const dy = 0;
        const dWidth = cropCanvas.width;
        const dHeight = cropCanvas.height;

        // Draw basemap then deck.gl layers on top at high resolution
        ctx.drawImage(
          mapCanvas,
          sx,
          sy,
          sWidth,
          sHeight,
          dx,
          dy,
          dWidth,
          dHeight
        );
        ctx.drawImage(
          deckCanvas,
          sx,
          sy,
          sWidth,
          sHeight,
          dx,
          dy,
          dWidth,
          dHeight
        );

        // Convert to data URL and store it
        const dataUrl = cropCanvas.toDataURL("image/png", 1.0);
        screenshotDataUrlRef.current = dataUrl;

        // Export
        cropCanvas.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = `${layer.name}-screenshot-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          },
          "image/png",
          1.0
        );

        // Store coordinates
        const bboxData = {
          layerId: pendingScreenshotLayerId,
          coordinates: {
            topLeft: [minLng, maxLat],
            topRight: [maxLng, maxLat],
            bottomRight: [maxLng, minLat],
            bottomLeft: [minLng, minLat],
          },
          bounds: layer.bounds,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(
          `bbox-${pendingScreenshotLayerId}`,
          JSON.stringify(bboxData)
        );
      }

      setPendingScreenshotLayerId(null);
    },
    [pendingScreenshotLayerId, layerManager, deckRef, mapRef]
  );

  const screenshotWidget = useMemo(() => {
    return new ScreenshotWidget({
      id: "screenshot",
      placement: "top-right",
      filename: "deck-screenshot.png",
      onCapture: handleCustomScreenshot,
    });
  }, [handleCustomScreenshot]);

  const captureScreenshot = useCallback(
    async (layerId: string): Promise<string> => {
      const layer = layerManager.getLayer(layerId);
      if (!layer?.bounds) {
        console.error("Cannot capture screenshot: missing bounds");
        return "";
      }

      // Reset the data URL
      screenshotDataUrlRef.current = null;

      // Temporarily hide the bounding box layer
      const originalVisibility = layer.visible;
      layerManager.toggleLayer(layerId);
      setLayerRevision((prev) => prev + 1);

      // Store the layer ID for the capture callback
      setPendingScreenshotLayerId(layerId);

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Trigger the screenshot widget
      if (screenshotWidget) {
        screenshotWidget.handleClick();
      }

      // Wait for screenshot to be captured
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Restore layer visibility
      setTimeout(() => {
        if (originalVisibility !== layer.visible) {
          layerManager.toggleLayer(layerId);
          setLayerRevision((prev) => prev + 1);
        }
      }, 100);

      // Return the captured screenshot data URL
      return screenshotDataUrlRef.current || "";
    },
    [layerManager, screenshotWidget, setLayerRevision]
  );

  return {
    screenshotWidget,
    captureScreenshot,
  };
}
