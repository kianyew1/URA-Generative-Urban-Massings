import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import path from "node:path";

const CACHE_PATH = path.join(process.cwd(), "public", "nano_banana_output.png");

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const formData = await req.formData();
    const promptText = formData.get("prompt") as string;
    // console.log(promptText);
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      if (fs.existsSync(CACHE_PATH)) {
        console.log("No image uploaded — serving cached image");
        const buffer = fs.readFileSync(CACHE_PATH);
        return new Response(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": "inline; filename=nano_banana_output.png",
          },
        });
      }
      return new Response("No image uploaded and no cached image available.", {
        status: 400,
      });
    }

    const arrayBuffer = await (imageFile as any).arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const prompt = [
      { text: promptText },
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
    return new Response(buffer, {
      //buffer is the actual image
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
