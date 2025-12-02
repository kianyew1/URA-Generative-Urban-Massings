import { GoogleGenAI } from "@google/genai";

// Force dynamic rendering and log runtime environment
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

console.log("[nano_banana] Route file loaded");
console.log("[nano_banana] Runtime:", runtime);
console.log("[nano_banana] API Key exists:", !!process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
  const requestId = Date.now().toString();

  console.log(`[${requestId}] POST request received`);
  console.log(`[${requestId}] Request URL:`, req.url);
  console.log(`[${requestId}] Request method:`, req.method);
  console.log(
    `[${requestId}] Headers:`,
    Object.fromEntries(req.headers.entries())
  );

  try {
    // Validate API key exists
    if (!process.env.GOOGLE_API_KEY) {
      console.error(`[${requestId}] API key not configured`);
      return new Response("API key not configured", { status: 500 });
    }

    console.log(`[${requestId}] Initializing GoogleGenAI`);
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    console.log(`[${requestId}] Parsing formData`);
    const formData = await req.formData();
    const promptText = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File;

    console.log(`[${requestId}] Prompt text:`, promptText?.substring(0, 100));
    console.log(
      `[${requestId}] Image file:`,
      imageFile?.name,
      imageFile?.type,
      imageFile?.size
    );

    // Validate inputs
    if (!imageFile) {
      console.error(`[${requestId}] No image file provided`);
      return new Response("No image file provided", { status: 400 });
    }

    if (!promptText) {
      console.error(`[${requestId}] No prompt provided`);
      return new Response("No prompt provided", { status: 400 });
    }

    console.log(`[${requestId}] Converting image to base64`);
    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    console.log(`[${requestId}] Base64 image length:`, base64Image.length);

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
    // Generate content
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
    });

    console.log(`[${requestId}] Gemini response received`);
    console.log(
      `[${requestId}] Response candidates:`,
      response.candidates?.length
    );

    // Extract generated image
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      console.error(`[${requestId}] No image returned by the model`);
      console.error(
        `[${requestId}] Response structure:`,
        JSON.stringify(response, null, 2)
      );
      return new Response("No image returned by the model", { status: 500 });
    }

    console.log(`[${requestId}] Converting response to buffer`);
    // Convert base64 to buffer
    const generatedImage = Buffer.from(imagePart.inlineData.data, "base64");
    console.log(`[${requestId}] Generated image size:`, generatedImage.length);

    console.log(`[${requestId}] Sending successful response`);
    // Return image directly
    return new Response(generatedImage, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=generated.png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error in nano_banana endpoint:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    console.error(`[${requestId}] Error name:`, error.name);
    console.error(`[${requestId}] Error message:`, error.message);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Add OPTIONS for CORS if needed
export async function OPTIONS(req: Request) {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] OPTIONS request received`);
  console.log(`[${requestId}] Request URL:`, req.url);
  console.log(
    `[${requestId}] Headers:`,
    Object.fromEntries(req.headers.entries())
  );

  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Add a GET handler to verify the route is accessible
export async function GET(req: Request) {
  console.log("[nano_banana] GET request received - route is alive");
  return new Response(
    JSON.stringify({
      status: "alive",
      method: "GET",
      timestamp: new Date().toISOString(),
      runtime: runtime,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
