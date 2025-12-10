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
  dimensions?: { width: number; height: number };
}

// Road generation JSON prompt structure
interface RoadPromptConfig {
  style: string;
  view: string;
  site_dimensions: string;
  map_elements: {
    water: string;
    land: string;
  };
  road_design: {
    type: string;
    geometry: string;
    hierarchy: string;
    placement_rules: string;
  };
  visual_style: string;
  constraints: string;
  negative_prompt: string;
}

// Building generation JSON prompt structure (zero-shot)
interface BuildingPromptConfig {
  style: string;
  view: string;
  site_dimensions: string;
  map_elements: {
    roads: string;
    water: string;
    parks: string;
    land: string;
  };
  building_design: {
    type: string;
    form: string;
    arrangement: string;
    placement_rules: string;
  };
  visual_style: string;
  constraints: string;
  negative_prompt: string;
}

// Parcelisation JSON prompt structure
interface ParcelisationPromptConfig {
  style: string;
  view: string;
  map_elements: {
    water: string;
    roads: string;
    land: string;
  };
  zoning_rules: {
    waterfront_treatment: string;
    residential_allocation: string;
    commercial_allocation: string;
    color_scheme: string;
  };
  visual_style: string;
  constraints: string;
  negative_prompt: string;
}

// Step 1: Road generation presets
const ROAD_STYLE_PRESETS: Array<{
  id: string;
  name: string;
  image: string;
  config: RoadPromptConfig;
}> = [
  {
    id: "yishun",
    name: "Yishun Asymmetric Network",
    image: "/styles/road_organic.jpg",
    config: {
      style: "Singapore Urban Planning Zoning Map",
      view: "Top-down 2D digital map",
      site_dimensions: "To be filled",
      map_elements: {
        water: "Blue; no roads allowed",
        land: "White areas; preserve natural parcel irregularity; do not generate new green spaces, do not remove green spaces.",
      },
      road_design: {
        type: "Asymmetric irregular road network",
        geometry:
          "Roads follow uneven parcel outlines with diagonal connectors and curved segments",
        hierarchy:
          "Primary irregular axes thicker; fragmentary secondary roads thinner",
        placement_rules:
          "Replicate Yishun-style broken parcel logic, varied shapes, asymmetric blocks; no new white spaces; only draw roads",
      },
      visual_style: "Clean vector, flat colours",
      constraints: "Avoid perfect grids or radial symmetry",
      negative_prompt:
        "3D, isometric, realistic satellite view, aerial photography, textured water, dark background, blurry, low resolution, simple square boxes, perspective view, thin roads, roads on water, grey in blue area, green areas, parks, park spaces",
    },
  },
  {
    id: "grid",
    name: "Grid Road Network",
    image: "/styles/road_grid.jpg",
    config: {
      style: "Singapore Urban Planning Zoning Map",
      view: "Top-down 2D digital map",
      site_dimensions: "To be filled",
      map_elements: {
        water: "Blue; no roads allowed",
        land: "White areas; maintain for road network",
      },
      road_design: {
        type: "Orthogonal grid road network",
        geometry:
          "Roads form regular grid pattern with perpendicular intersections",
        hierarchy:
          "Primary roads run north-south and east-west; secondary roads form uniform grid",
        placement_rules:
          "Create Manhattan-style grid; uniform block sizes; only draw roads",
      },
      visual_style: "Clean vector, flat colours",
      constraints:
        "Maintain strict orthogonal geometry; avoid curves or diagonal roads",
      negative_prompt:
        "3D, isometric, buildings, shadows, curves, organic shapes, diagonal roads, parks, green spaces",
    },
  },
  {
    id: "radial",
    name: "Radial Road Network",
    image: "/styles/road_radial.jpg",
    config: {
      style: "Singapore Urban Planning Zoning Map",
      view: "Top-down 2D digital map",
      site_dimensions: "To be filled",
      map_elements: {
        water: "Blue; no roads allowed",
        land: "White areas; for radial road network",
      },
      road_design: {
        type: "Radial road network",
        geometry:
          "Roads radiate from central points with concentric circular or arc roads connecting them",
        hierarchy:
          "Primary radial roads from center; secondary concentric ring roads",
        placement_rules:
          "Mix of radial and ring roads; avoid pure grid; only draw roads",
      },
      visual_style: "Clean vector, flat colours",
      constraints: "Radiate from central focal points; maintain symmetry",
      negative_prompt:
        "3D, isometric, buildings, shadows, straight grid, random placement, parks, green spaces",
    },
  },
];

// Step 2: Parcelisation presets
const PARCELISATION_PRESETS: Array<{
  id: string;
  name: string;
  image: string;
  config: ParcelisationPromptConfig;
}> = [
  {
    id: "default",
    name: "Standard Zoning",
    image: "/styles/parcelisation_default.jpg",
    config: {
      style: "Singapore Urban Planning Zoning Map",
      view: "Top-down 2D vector site plan",
      map_elements: {
        water: "Blue; preserved",
        roads: "Grey; highways remain grey",
        land: "White empty areas; to be zoned",
      },
      zoning_rules: {
        waterfront_treatment:
          "Convert ONLY white empty areas that directly touch blue water into green landscape; no other areas should be green",
        residential_allocation:
          "70% of remaining white land areas fully bounded by roads (not touching water) becomes Red Zone for Residential land-use",
        commercial_allocation:
          "30% of remaining white land areas fully bounded by roads (not touching water) becomes Yellow Zone for Commercial land-use",
        color_scheme:
          "Recolor ground plane itself; do not populate zones with buildings",
      },
      visual_style: "Flat colors, clean zoning diagram",
      constraints:
        "No buildings; only ground plane recoloring; roads remain grey",
      negative_prompt:
        "black outlines, 3D, shadows, gradients, textured water, satellite realism, buildings in water, buildings on roads, multi-colored buildings, buildings",
    },
  },
];

// Step 2 Alternative: Building generation presets (zero-shot method)
const BUILDING_STYLE_PRESETS: Array<{
  id: string;
  name: string;
  image: string;
  config: BuildingPromptConfig;
}> = [
  {
    id: "punggol",
    name: "Punggol style",
    image: "/styles/punggol.jpg",
    config: {
      style: "Singapore HDB residential architectural site plan",
      view: "Top-down 2D architectural diagram",
      site_dimensions: "To be filled",
      map_elements: {
        roads: "Grey; existing road network preserved",
        water: "Blue; no buildings allowed",
        parks: "Green; existing parks preserved",
        land: "White areas between roads; to be populated with buildings",
      },
      building_design: {
        type: "High-density residential buildings",
        form: "H-shaped blocks, linear slabs with stepped facades, and interconnected geometric clusters",
        arrangement:
          "Buildings arranged to follow road curvature; high-density housing pattern",
        placement_rules:
          "Populate ONLY white land areas between roads with solid red building silhouettes; no black outlines; no buildings in water or on roads",
      },
      visual_style:
        "Flat colors, architectural diagram aesthetic, solid red silhouettes",
      constraints:
        "Buildings must be solid red only; follow road curvature; high-density pattern",
      negative_prompt:
        "black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings, multi-colored buildings",
    },
  },
  {
    id: "bedok",
    name: "Bedok South Segmented Slab",
    image: "/styles/bedok.jpg",
    config: {
      style: "Singapore HDB residential architectural site plan",
      view: "Top-down 2D architectural diagram",
      site_dimensions: "To be filled",
      map_elements: {
        roads: "Grey; existing road network preserved",
        water: "Blue; no buildings allowed",
        parks: "Green; existing parks preserved",
        land: "White areas between roads; to be populated with buildings",
      },
      building_design: {
        type: "Mid-rise residential buildings",
        form: "Rectilinear slab blocks forming U- and L-shaped enclosures",
        arrangement:
          "Modular footprints with consistent grid geometry, placed orthogonally; classic HDB pattern",
        placement_rules:
          "Populate ONLY white land areas between roads with solid red building silhouettes; no black outlines; no buildings in water or on roads",
      },
      visual_style:
        "Flat colors, architectural diagram aesthetic, solid red silhouettes",
      constraints:
        "Buildings must be solid red only; orthogonal placement; classic HDB modular pattern",
      negative_prompt:
        "black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings, curved buildings",
    },
  },
  {
    id: "queenstown",
    name: "Queenstown Dawson",
    image: "/styles/queenstown.jpg",
    config: {
      style: "Singapore HDB residential architectural site plan",
      view: "Top-down 2D architectural diagram",
      site_dimensions: "To be filled",
      map_elements: {
        roads: "Grey; existing road network preserved",
        water: "Blue; no buildings allowed",
        parks: "Green; existing parks preserved",
        land: "White areas between roads; to be populated with buildings",
      },
      building_design: {
        type: "Slender residential towers",
        form: "Slim blocks with curved or tapered footprints",
        arrangement:
          "Staggered parallel rows emphasizing slenderness and separation; high ventilation permeability",
        placement_rules:
          "Populate ONLY white land areas between roads with solid red building silhouettes; no black outlines; no buildings in water or on roads",
      },
      visual_style:
        "Flat colors, architectural diagram aesthetic, solid red silhouettes",
      constraints:
        "Buildings must be solid red only; emphasize slenderness; high separation between blocks",
      negative_prompt:
        "black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings, bulky buildings",
    },
  },
  {
    id: "toapayoh",
    name: "Toa Payoh Central Courtyard",
    image: "/styles/toapayoh.jpg",
    config: {
      style: "Singapore HDB residential architectural site plan",
      view: "Top-down 2D architectural diagram",
      site_dimensions: "To be filled",
      map_elements: {
        roads: "Grey; existing road network preserved",
        water: "Blue; no buildings allowed",
        parks: "Green; existing parks preserved",
        land: "White areas between roads; to be populated with buildings",
      },
      building_design: {
        type: "Articulated residential slabs",
        form: "Long rectilinear slabs broken into articulated segments with rhythmic sawtooth setbacks",
        arrangement:
          "Follow sweeping arcs shaped by coastal alignments; semi-open clusters with wide green buffers",
        placement_rules:
          "Populate ONLY white land areas between roads with solid red building silhouettes; no black outlines; no buildings in water or on roads",
      },
      visual_style:
        "Flat colors, architectural diagram aesthetic, solid red silhouettes",
      constraints:
        "Buildings must be solid red only; follow coastal arcs; maintain wide green buffers",
      negative_prompt:
        "black outlines, 3D, shadows, gradient, buildings in water, buildings on roads, blue buildings, grey buildings, compact clusters",
    },
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
  dimensions,
}: ScreenshotDialogProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>("road");
  const [generationMethod, setGenerationMethod] =
    useState<GenerationMethod>("parcel-based");
  const [roadConfig, setRoadConfig] = useState<RoadPromptConfig>({
    style: "",
    view: "",
    site_dimensions: "",
    map_elements: { water: "", land: "" },
    road_design: { type: "", geometry: "", hierarchy: "", placement_rules: "" },
    visual_style: "",
    constraints: "",
    negative_prompt: "",
  });
  const [parcelisationConfig, setParcelisationConfig] =
    useState<ParcelisationPromptConfig>({
      style: "",
      view: "",
      map_elements: { water: "", roads: "", land: "" },
      zoning_rules: {
        waterfront_treatment: "",
        residential_allocation: "",
        commercial_allocation: "",
        color_scheme: "",
      },
      visual_style: "",
      constraints: "",
      negative_prompt: "",
    });
  const [buildingConfig, setBuildingConfig] = useState<BuildingPromptConfig>({
    style: "",
    view: "",
    site_dimensions: "",
    map_elements: { roads: "", water: "", parks: "", land: "" },
    building_design: {
      type: "",
      form: "",
      arrangement: "",
      placement_rules: "",
    },
    visual_style: "",
    constraints: "",
    negative_prompt: "",
  });
  const [selectedRoadStyle, setSelectedRoadStyle] = useState<string | null>(
    null
  );
  const [selectedParcelisationStyle, setSelectedParcelisationStyle] = useState<
    string | null
  >(null);
  const [selectedBuildingStyle, setSelectedBuildingStyle] = useState<
    string | null
  >(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
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
      // DON'T clean up blob URLs - they're being used by layers on the map
      // The browser will clean them up when the page unloads
      // If we revoke them here, the BitmapLayer will fail to load

      setGeneratedImages({ road: null, parcelisation: null, building: null });
      setCurrentStep("road");
      setGenerationMethod("parcel-based");
      setGeneratedBlobs({ road: null, parcelisation: null, building: null });
      setRoadConfig({
        style: "",
        view: "",
        site_dimensions: "",
        map_elements: { water: "", land: "" },
        road_design: {
          type: "",
          geometry: "",
          hierarchy: "",
          placement_rules: "",
        },
        visual_style: "",
        constraints: "",
        negative_prompt: "",
      });
      setParcelisationConfig({
        style: "",
        view: "",
        map_elements: { water: "", roads: "", land: "" },
        zoning_rules: {
          waterfront_treatment: "",
          residential_allocation: "",
          commercial_allocation: "",
          color_scheme: "",
        },
        visual_style: "",
        constraints: "",
        negative_prompt: "",
      });
      setBuildingConfig({
        style: "",
        view: "",
        site_dimensions: "",
        map_elements: { roads: "", water: "", parks: "", land: "" },
        building_design: {
          type: "",
          form: "",
          arrangement: "",
          placement_rules: "",
        },
        visual_style: "",
        constraints: "",
        negative_prompt: "",
      });
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
      const configWithDimensions = {
        ...style.config,
        site_dimensions: dimensions
          ? `${dimensions.width.toFixed(1)}m × ${dimensions.height.toFixed(1)}m`
          : "To be filled",
      };
      setRoadConfig(configWithDimensions);
      setSelectedRoadStyle(styleId);
    }
  };

  const handleParcelisationStyleSelect = (styleId: string) => {
    const style = PARCELISATION_PRESETS.find((s) => s.id === styleId);
    if (style) {
      setParcelisationConfig(style.config);
      setSelectedParcelisationStyle(styleId);
    }
  };

  const handleBuildingStyleSelect = (styleId: string) => {
    const style = BUILDING_STYLE_PRESETS.find((s) => s.id === styleId);
    if (style) {
      const configWithDimensions = {
        ...style.config,
        site_dimensions: dimensions
          ? `${dimensions.width.toFixed(1)}m × ${dimensions.height.toFixed(1)}m`
          : "To be filled",
      };
      setBuildingConfig(configWithDimensions);
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
    if (!screenshotUrl || !roadConfig.style) return;

    setIsLoading(true);
    try {
      const promptJson = JSON.stringify(roadConfig);
      const { url, blob } = await generateImage(screenshotUrl, promptJson);
      setGeneratedImages((prev) => ({ ...prev, road: url }));
      setGeneratedBlobs((prev) => ({ ...prev, road: blob }));

      downloadImage(blob, `road-network-${Date.now()}.png`);

      // Automatically add road layer to map
      if (boundingBox && boundingBox.coordinates) {
        const coordinates = boundingBox.coordinates[0];
        const lngs = coordinates.map((coord: number[]) => coord[0]);
        const lats = coordinates.map((coord: number[]) => coord[1]);

        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        const layerId = `generated-road-${Date.now()}`;
        // BitmapLayer expects bounds as [left, bottom, right, top]
        const bounds = [minLng, minLat, maxLng, maxLat];

        console.log("Adding road layer with bounds:", bounds);

        layerManager.addLayer({
          id: layerId,
          name: `Generated Road Network ${new Date().toLocaleTimeString()}`,
          visible: true,
          type: "bitmap",
          category: "user",
          image: url, // Keep the blob URL
          bounds: bounds,
          opacity: 0.8,
        });

        // Trigger a re-render of layers
        onSubmit(layerId);
      }

      setCurrentStep("parcelisation");
    } catch (error) {
      console.error("Error generating road network:", error);
      alert("Failed to generate road network. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateParcelisation = async () => {
    if (!generatedBlobs.road || !parcelisationConfig.style) return;

    setIsLoading(true);
    try {
      const roadUrl = window.URL.createObjectURL(generatedBlobs.road);
      const promptJson = JSON.stringify(parcelisationConfig);
      const { url, blob } = await generateImage(roadUrl, promptJson);
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
    if (!generatedBlobs.road || !buildingConfig.style) return;

    setIsLoading(true);
    try {
      const roadUrl = window.URL.createObjectURL(generatedBlobs.road);
      const promptJson = JSON.stringify(buildingConfig);
      const { url, blob } = await generateImage(roadUrl, promptJson);
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
      const reader = new FileReader();
      reader.readAsDataURL(generatedBlobs.parcelisation);

      return new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Image = (reader.result as string).split(",")[1];

            const apiUrl =
              process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

            // Prepare request for parcel generate endpoint
            const requestBody = {
              image: base64Image,
              bbox: boundingBox,
              zone: "residential", // Default to residential; could be made configurable
              simplify_tolerance_m: 5.0,
              min_area_ratio: 0.0001,
              threshold_m: 100, // Distance threshold for water/green adjustment
              lpm: 5, // Levels per meter for height calculation
              run_ai: true, // Enable AI generation
              model: "gemini-3-pro-image-preview", // Gemini model to use
            };

            const apiResponse = await fetch(
              `${apiUrl}/api/py/parcel/generate`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              }
            );

            if (!apiResponse.ok) {
              const error = await apiResponse.json();
              throw new Error(error.detail || "Failed to generate buildings");
            }

            const geojsonData = await apiResponse.json();

            // Add generated buildings to map
            const layerId = `generated-buildings-${Date.now()}`;
            layerManager.addLayer({
              id: layerId,
              name: `Generated Buildings ${new Date().toLocaleTimeString()}`,
              visible: true,
              type: "imported",
              category: "user",
              data: geojsonData,
            });

            // Download the GeoJSON
            const geojsonBlob = new Blob(
              [JSON.stringify(geojsonData, null, 2)],
              {
                type: "application/json",
              }
            );
            const geojsonUrl = window.URL.createObjectURL(geojsonBlob);

            const a = document.createElement("a");
            a.href = geojsonUrl;
            a.download = `generated-parcels-${Date.now()}.geojson`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(geojsonUrl);
            document.body.removeChild(a);

            // Close dialog and resolve
            onClose();
            setIsLoading(false);
            resolve();
          } catch (error) {
            console.error("Error generating and adding buildings:", error);
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            alert(`Failed to generate buildings: ${errorMessage}`);
            setIsLoading(false);
            reject(error);
          }
        };
        reader.onerror = () => {
          const error = new Error("Failed to read parcelisation image");
          console.error(error);
          alert("Failed to read parcelisation image");
          setIsLoading(false);
          reject(error);
        };
      });
    } catch (error) {
      console.error("Error in handleGenerateAndAddBuildings:", error);
      alert("Failed to process parcelisation image. Please try again.");
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
            type: "imported",
            category: "user",
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
    setParcelisationConfig({
      style: "",
      view: "",
      map_elements: { water: "", roads: "", land: "" },
      zoning_rules: {
        waterfront_treatment: "",
        residential_allocation: "",
        commercial_allocation: "",
        color_scheme: "",
      },
      visual_style: "",
      constraints: "",
      negative_prompt: "",
    });
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
    if (currentStep === "road") return JSON.stringify(roadConfig, null, 2);
    if (currentStep === "parcelisation") {
      return generationMethod === "parcel-based"
        ? JSON.stringify(parcelisationConfig, null, 2)
        : JSON.stringify(buildingConfig, null, 2);
    }
    return "";
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
      try {
        const parsed = JSON.parse(value);
        setRoadConfig(parsed);
      } catch (e) {
        // Invalid JSON, ignore
      }
    } else if (currentStep === "parcelisation") {
      if (generationMethod === "parcel-based") {
        try {
          const parsed = JSON.parse(value);
          setParcelisationConfig(parsed);
        } catch (e) {
          // Invalid JSON, ignore
        }
      } else {
        try {
          const parsed = JSON.parse(value);
          setBuildingConfig(parsed);
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
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

              {/* Road Generation Form - only for road step */}
              {currentStep === "road" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">
                    Road Design Parameters
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Road Design - Type
                      </label>
                      <input
                        type="text"
                        value={roadConfig.road_design.type}
                        onChange={(e) =>
                          setRoadConfig({
                            ...roadConfig,
                            road_design: {
                              ...roadConfig.road_design,
                              type: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g., Asymmetric irregular road network"
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Road Design - Geometry
                      </label>
                      <Textarea
                        value={roadConfig.road_design.geometry}
                        onChange={(e) =>
                          setRoadConfig({
                            ...roadConfig,
                            road_design: {
                              ...roadConfig.road_design,
                              geometry: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 resize-none text-sm"
                        placeholder="e.g., Roads follow uneven parcel outlines with diagonal connectors"
                        disabled={isLoading}
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Road Design - Hierarchy
                      </label>
                      <Textarea
                        value={roadConfig.road_design.hierarchy}
                        onChange={(e) =>
                          setRoadConfig({
                            ...roadConfig,
                            road_design: {
                              ...roadConfig.road_design,
                              hierarchy: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 resize-none text-sm"
                        placeholder="e.g., Primary irregular axes thicker; fragmentary secondary roads thinner"
                        disabled={isLoading}
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Road Design - Placement Rules
                      </label>
                      <Textarea
                        value={roadConfig.road_design.placement_rules}
                        onChange={(e) =>
                          setRoadConfig({
                            ...roadConfig,
                            road_design: {
                              ...roadConfig.road_design,
                              placement_rules: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 resize-none text-sm"
                        placeholder="e.g., Replicate Yishun-style broken parcel logic"
                        disabled={isLoading}
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Constraints
                      </label>
                      <Textarea
                        value={roadConfig.constraints}
                        onChange={(e) =>
                          setRoadConfig({
                            ...roadConfig,
                            constraints: e.target.value,
                          })
                        }
                        className="w-full mt-1 resize-none text-sm"
                        placeholder="e.g., Match reference highway at top; avoid perfect grids"
                        disabled={isLoading}
                        rows={2}
                      />
                    </div>

                    {/* Advanced Settings Dropdown */}
                    <div className="border-t pt-3">
                      <button
                        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        <span>Advanced Settings</span>
                        <svg
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isAdvancedOpen ? "rotate-180" : ""
                          )}
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

                      {isAdvancedOpen && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Site Dimensions
                            </label>
                            <input
                              type="text"
                              value={roadConfig.site_dimensions}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  site_dimensions: e.target.value,
                                })
                              }
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                              placeholder="Auto-filled from bounding box"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Style
                            </label>
                            <input
                              type="text"
                              value={roadConfig.style}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  style: e.target.value,
                                })
                              }
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="e.g., Singapore Urban Planning Zoning Map"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              View
                            </label>
                            <input
                              type="text"
                              value={roadConfig.view}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  view: e.target.value,
                                })
                              }
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="e.g., Top-down 2D digital map"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Map Elements - Water
                            </label>
                            <input
                              type="text"
                              value={roadConfig.map_elements.water}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  map_elements: {
                                    ...roadConfig.map_elements,
                                    water: e.target.value,
                                  },
                                })
                              }
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="e.g., Blue; no roads allowed"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Map Elements - Land
                            </label>
                            <input
                              type="text"
                              value={roadConfig.map_elements.land}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  map_elements: {
                                    ...roadConfig.map_elements,
                                    land: e.target.value,
                                  },
                                })
                              }
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="e.g., White areas; preserve natural parcel irregularity"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Visual Style
                            </label>
                            <input
                              type="text"
                              value={roadConfig.visual_style}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  visual_style: e.target.value,
                                })
                              }
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              placeholder="e.g., Clean vector, flat colours"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">
                              Negative Prompt
                            </label>
                            <Textarea
                              value={roadConfig.negative_prompt}
                              onChange={(e) =>
                                setRoadConfig({
                                  ...roadConfig,
                                  negative_prompt: e.target.value,
                                })
                              }
                              className="w-full mt-1 resize-none text-sm"
                              placeholder="e.g., 3D, isometric, buildings, shadows"
                              disabled={isLoading}
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Building Generation Form - only for zero-shot building generation in parcelisation step */}
              {currentStep === "parcelisation" &&
                generationMethod === "zero-shot" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">
                      Building Design Parameters
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Building Design - Type
                        </label>
                        <input
                          type="text"
                          value={buildingConfig.building_design.type}
                          onChange={(e) =>
                            setBuildingConfig({
                              ...buildingConfig,
                              building_design: {
                                ...buildingConfig.building_design,
                                type: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., High-density residential buildings"
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Building Design - Form
                        </label>
                        <Textarea
                          value={buildingConfig.building_design.form}
                          onChange={(e) =>
                            setBuildingConfig({
                              ...buildingConfig,
                              building_design: {
                                ...buildingConfig.building_design,
                                form: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., H-shaped blocks, linear slabs with stepped facades"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Building Design - Arrangement
                        </label>
                        <Textarea
                          value={buildingConfig.building_design.arrangement}
                          onChange={(e) =>
                            setBuildingConfig({
                              ...buildingConfig,
                              building_design: {
                                ...buildingConfig.building_design,
                                arrangement: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., Buildings arranged to follow road curvature"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Building Design - Placement Rules
                        </label>
                        <Textarea
                          value={buildingConfig.building_design.placement_rules}
                          onChange={(e) =>
                            setBuildingConfig({
                              ...buildingConfig,
                              building_design: {
                                ...buildingConfig.building_design,
                                placement_rules: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., Populate ONLY white land areas with red silhouettes"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Constraints
                        </label>
                        <Textarea
                          value={buildingConfig.constraints}
                          onChange={(e) =>
                            setBuildingConfig({
                              ...buildingConfig,
                              constraints: e.target.value,
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., Buildings must be solid red only"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      {/* Advanced Settings Dropdown */}
                      <div className="border-t pt-3">
                        <button
                          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                          disabled={isLoading}
                          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <span>Advanced Settings</span>
                          <svg
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isAdvancedOpen ? "rotate-180" : ""
                            )}
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

                        {isAdvancedOpen && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Site Dimensions
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.site_dimensions}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    site_dimensions: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                                placeholder="Auto-filled from bounding box"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Style
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.style}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    style: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Singapore HDB residential architectural site plan"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                View
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.view}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    view: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Top-down 2D architectural diagram"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Roads
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.map_elements.roads}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    map_elements: {
                                      ...buildingConfig.map_elements,
                                      roads: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Grey; existing road network preserved"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Water
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.map_elements.water}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    map_elements: {
                                      ...buildingConfig.map_elements,
                                      water: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Blue; no buildings allowed"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Parks
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.map_elements.parks}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    map_elements: {
                                      ...buildingConfig.map_elements,
                                      parks: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Green; existing parks preserved"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Land
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.map_elements.land}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    map_elements: {
                                      ...buildingConfig.map_elements,
                                      land: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., White areas between roads; to be populated"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Visual Style
                              </label>
                              <input
                                type="text"
                                value={buildingConfig.visual_style}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    visual_style: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Flat colors, solid red silhouettes"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Negative Prompt
                              </label>
                              <Textarea
                                value={buildingConfig.negative_prompt}
                                onChange={(e) =>
                                  setBuildingConfig({
                                    ...buildingConfig,
                                    negative_prompt: e.target.value,
                                  })
                                }
                                className="w-full mt-1 resize-none text-sm"
                                placeholder="e.g., black outlines, 3D, shadows, gradient"
                                disabled={isLoading}
                                rows={3}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Parcelisation Generation Form - only for parcel-based parcelisation in parcelisation step */}
              {currentStep === "parcelisation" &&
                generationMethod === "parcel-based" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Zoning Parameters</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Waterfront Treatment
                        </label>
                        <Textarea
                          value={
                            parcelisationConfig.zoning_rules
                              .waterfront_treatment
                          }
                          onChange={(e) =>
                            setParcelisationConfig({
                              ...parcelisationConfig,
                              zoning_rules: {
                                ...parcelisationConfig.zoning_rules,
                                waterfront_treatment: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., Convert white areas touching water into green landscape"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Residential Allocation
                        </label>
                        <Textarea
                          value={
                            parcelisationConfig.zoning_rules
                              .residential_allocation
                          }
                          onChange={(e) =>
                            setParcelisationConfig({
                              ...parcelisationConfig,
                              zoning_rules: {
                                ...parcelisationConfig.zoning_rules,
                                residential_allocation: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., 70% of land becomes Red Zone for Residential"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Commercial Allocation
                        </label>
                        <Textarea
                          value={
                            parcelisationConfig.zoning_rules
                              .commercial_allocation
                          }
                          onChange={(e) =>
                            setParcelisationConfig({
                              ...parcelisationConfig,
                              zoning_rules: {
                                ...parcelisationConfig.zoning_rules,
                                commercial_allocation: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., 30% of land becomes Yellow Zone for Commercial"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Color Scheme
                        </label>
                        <Textarea
                          value={parcelisationConfig.zoning_rules.color_scheme}
                          onChange={(e) =>
                            setParcelisationConfig({
                              ...parcelisationConfig,
                              zoning_rules: {
                                ...parcelisationConfig.zoning_rules,
                                color_scheme: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., Recolor ground plane; no buildings"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Constraints
                        </label>
                        <Textarea
                          value={parcelisationConfig.constraints}
                          onChange={(e) =>
                            setParcelisationConfig({
                              ...parcelisationConfig,
                              constraints: e.target.value,
                            })
                          }
                          className="w-full mt-1 resize-none text-sm"
                          placeholder="e.g., No buildings; only ground plane recoloring"
                          disabled={isLoading}
                          rows={2}
                        />
                      </div>

                      {/* Advanced Settings Dropdown */}
                      <div className="border-t pt-3">
                        <button
                          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                          disabled={isLoading}
                          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <span>Advanced Settings</span>
                          <svg
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isAdvancedOpen ? "rotate-180" : ""
                            )}
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

                        {isAdvancedOpen && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Style
                              </label>
                              <input
                                type="text"
                                value={parcelisationConfig.style}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    style: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Singapore Urban Planning Zoning Map"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                View
                              </label>
                              <input
                                type="text"
                                value={parcelisationConfig.view}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    view: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Top-down 2D vector site plan"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Water
                              </label>
                              <input
                                type="text"
                                value={parcelisationConfig.map_elements.water}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    map_elements: {
                                      ...parcelisationConfig.map_elements,
                                      water: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Blue; preserved"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Roads
                              </label>
                              <input
                                type="text"
                                value={parcelisationConfig.map_elements.roads}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    map_elements: {
                                      ...parcelisationConfig.map_elements,
                                      roads: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Grey; highways remain grey"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Map Elements - Land
                              </label>
                              <input
                                type="text"
                                value={parcelisationConfig.map_elements.land}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    map_elements: {
                                      ...parcelisationConfig.map_elements,
                                      land: e.target.value,
                                    },
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., White empty areas; to be zoned"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Visual Style
                              </label>
                              <input
                                type="text"
                                value={parcelisationConfig.visual_style}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    visual_style: e.target.value,
                                  })
                                }
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="e.g., Flat colors, clean zoning diagram"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">
                                Negative Prompt
                              </label>
                              <Textarea
                                value={parcelisationConfig.negative_prompt}
                                onChange={(e) =>
                                  setParcelisationConfig({
                                    ...parcelisationConfig,
                                    negative_prompt: e.target.value,
                                  })
                                }
                                className="w-full mt-1 resize-none text-sm"
                                placeholder="e.g., black outlines, 3D, shadows, buildings"
                                disabled={isLoading}
                                rows={3}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Building step message - only for parcel-based method */}
              {currentStep === "building" &&
                generationMethod === "parcel-based" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Building Generation
                    </label>
                    <p className="text-sm text-gray-600">
                      Click the button below to generate building footprints
                      from the parcelisation and add them to the map.
                    </p>
                  </div>
                )}
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
                      disabled={isLoading || !roadConfig.style}
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
                        disabled={isLoading || !parcelisationConfig.style}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoading ? "Generating..." : "Generate Parcelisation"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleGenerateZeroShotBuildings}
                        disabled={isLoading || !buildingConfig.style}
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
