import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    // Validate API key exists
    if (!process.env.GOOGLE_API_KEY) {
      return new Response("API key not configured", { status: 500 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const formData = await req.formData();
    const promptText = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File;

    // Validate inputs
    if (!imageFile) {
      return new Response("No image file provided", { status: 400 });
    }

    if (!promptText) {
      return new Response("No prompt provided", { status: 400 });
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

    // Generate content
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    // Extract generated image
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      return new Response("No image returned by the model", { status: 500 });
    }

    // Convert base64 to buffer
    const generatedImage = Buffer.from(imagePart.inlineData.data, "base64");

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
    console.error("Error in nano_banana endpoint:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
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
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
