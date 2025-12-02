import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVectorise() {
  // 1. Read image file from disk
  const imagePath = path.join(
    __dirname,
    "Generated Image December 02, 2025 - 3_43PM.jpeg"
  ); // Update this path
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  // 2. Define your bounding box
  const bbox = {
    type: "Polygon",
    coordinates: [
      // berlaryar creek
      [
        [103.79905169278454, 1.2732859847452844],
        [103.79905169278454, 1.2621693476745102],
        [103.81827942382483, 1.2621693476745102],
        [103.81827942382483, 1.2732859847452844],
        [103.79905169278454, 1.2732859847452844],
      ],
    ],
  };

  // 3. Send to Python API
  const apiUrl = "http://localhost:8000";

  try {
    console.log("Sending request to:", `${apiUrl}/api/py/vectorise`);

    const apiResponse = await fetch(`${apiUrl}/api/py/vectorise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        bbox: bbox,
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
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API error: ${apiResponse.statusText}\n${errorText}`);
    }

    const geojson = await apiResponse.json();
    console.log("✅ Generated GeoJSON successfully");

    // Save the result
    const outputPath = path.join(__dirname, "output.geojson");
    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
    console.log(`📄 Saved to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testVectorise();
