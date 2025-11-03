import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import path from "node:path";

const CACHE_PATH = path.join(process.cwd(), "public", "nano_banana_output.png");

export async function GET() {
  try {
    // If the cached image exists, serve it directly
    if (fs.existsSync(CACHE_PATH)) {
      const buffer = fs.readFileSync(CACHE_PATH);
      return new Response(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": "inline; filename=nano_banana_output.png",
        },
      });
    }

    // Otherwise, generate the image
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const imagePath = path.join(process.cwd(), "public", "input_img.png");
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");

    const prompt = [
      { 
        text: "🏙️ Urban Masterplan Generation Prompt (Strictly 2D – Height Labelled by Color Only)Prompt (Optimized for Realistic Scale & Strict 2D Rendering):Generate a flat, top-down 2D urban masterplan map — not a 3D rendering, not an isometric or perspective view.All buildings must be shown as flat geometric footprints on a white map background, using solid fill colors to represent their relative height categories, not extrusion or 3D form.The design should show roads, building footprints, and land-use zones strictly within the white-marked region of the reference map, keeping correct proportions and alignment.🧭 Design IntentCreate a realistic urban layout with appropriate building sizes, block shapes, and spacing typical of mixed-use waterfront developments.Include well-organized residential clusters, commercial/retail zones, industrial edges, civic landmarks, and public open spaces.Design should follow a hierarchical street structure with main boulevards, secondary streets, and pedestrian paths.Maintain the human-scaled, medium-density rhythm inspired by the V&A Waterfront, Cape Town — clean, legible, and visually balanced.🌊 Waterfront Height Distribution Logic (2D Representation Only):Distribute building height purely as color categories, while keeping all shapes completely 2D and flat.Do not extrude or render in perspective.Zone Distance from Water Height Representation Color0–50 m (Waterfront Edge) Up to 10 m (Low-rise) Small 2D rectangles or polygons 🔴 Red50–150 m (Intermediate Zone) Up to 30 m (Mid-rise) Medium 2D footprints 🟪 Magenta150 m+ (Inland or Key Intersections) Above 30 m (High-rise) Larger 2D polygons 🟫 BrownThese colors are labels, not physical heights.Buildings must remain flat and top-down, just varying in footprint size or tone density.🧱 Style & AestheticRendering Type: 2D orthographic top-down plan only.No shadows, lighting, gradients, perspective, or 3D effects.No isometric or aerial oblique angles.Use flat solid colors to distinguish categories.Keep clean geometric precision and urban legibility.Color Scheme:Buildings — Red (low-rise), Magenta (mid-rise), Brown (high-rise)⚫ Roads — Dark grey with clear width hierarchy🟩 Green spaces / parks — Green⬜ Civic / public buildings — White or light grey🟦 Water bodies — Blue (preserve shape and scale)Background — Pure white (no texture)🗺️ Rendering ConstraintsWork only within the white boundary of the reference image.Buildings must respect 1 cm = 200 m scale for realism.Keep realistic street width and block proportions.Ensure buildings never overlap water bodies or parks.Maintain balanced density, clear spacing, and open public edges.Emphasize clarity and order, not visual effects.💡 Design ReferencesInspired by V&A Waterfront (Cape Town), Hammarby Sjöstad (Stockholm), and Marina Bay (Singapore) for balanced waterfront density, visual hierarchy, and flat 2D plan clarity.🚫 Semantic Negative Prompts (Strong 2D Enforcement)Avoid: 3D rendering, perspective view, aerial angle, shadows, shading, gradients, textures, depth, or isometric projection.Focus: flat orthographic view, solid color shapes, minimalistic cartographic clarity."
       },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },
    ];

    const response: any = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    const imagePart = response.candidates[0].content.parts.find(
      (p: any) => p.inlineData
    );

    if (!imagePart) {
      return new Response("No image returned by the model.", { status: 500 });
    }

    const generatedBase64 = imagePart.inlineData.data;
    const buffer = Buffer.from(generatedBase64, "base64");

    // Save to cache
    fs.writeFileSync(CACHE_PATH, buffer);

    // Serve the image
    return new Response(buffer, { //buffer is the actual image
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=nano_banana_output.png", //suggests filename if you do a save as, 
      },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
