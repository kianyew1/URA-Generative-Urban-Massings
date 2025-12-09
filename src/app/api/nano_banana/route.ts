import { GoogleGenAI } from "@google/genai";

// Force dynamic rendering and log runtime environment
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

console.log("[nano_banana] Route file loaded");

export async function POST(req: Request) {
  const requestId = Date.now().toString();

  try {
    // Validate API key exists
    if (!process.env.GOOGLE_API_KEY) {
      console.error(`[${requestId}] API key not configured`);
      return new Response("API key not configured", { status: 500 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const formData = await req.formData();
    const promptText = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File;

    // 1. EXTRACT NEW PARAMETERS
    // We try to parse these, defaulting to undefined if not provided
    const widthParam = formData.get("width");
    const heightParam = formData.get("height");
    const aspectRatioParam = formData.get("aspect_ratio");
    const resolutionParam = formData.get("resolution"); // e.g., "1024x1024"

    console.log(
      `[${requestId}] Params - Width: ${widthParam}, Height: ${heightParam}`
    );

    // Validate inputs
    if (!imageFile || !promptText) {
      return new Response("No image or prompt provided", { status: 400 });
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Prepare the prompt for Gemini
    const prompt = [
      { text: promptText },
      {
        inlineData: {
          mimeType: imageFile.type || "image/png",
          data: base64Image,
        },
      },
    ];

    console.log(`[${requestId}] Calling Gemini API`);

    // 2. CONSTRUCT GENERATION CONFIG
    // This is where we tell the model what parameters to use.
    // Note: Not all models support explicit pixel dimensions, but this is the standard way to ask.
    const config: any = {
      responseMimeType: "application/json",
    };

    // If the SDK types support specific aspect ratios, add them here.
    // If TypeScript complains about unknown properties (like 'aspectRatio'),
    // you can cast it or use // @ts-ignore if you are sure the backend supports it.
    if (aspectRatioParam) {
      config.aspectRatio = aspectRatioParam.toString();
    }

    // Generate content
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: config, // <--- Pass the config object directly
    });

    // Extract generated image
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      console.error(`[${requestId}] No image returned`);
      return new Response("No image returned by the model", { status: 500 });
    }

    // Convert base64 to buffer
    const generatedImage = Buffer.from(imagePart.inlineData.data, "base64");
    console.log(`[${requestId}] Generated image size:`, generatedImage.length);

    // Return image
    return new Response(generatedImage, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=generated.png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ... OPTIONS and GET handlers remain the same
export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: Request) {
  return new Response(JSON.stringify({ status: "alive" }), { status: 200 });
}
