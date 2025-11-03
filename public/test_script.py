import base64
import requests
import json
from pathlib import Path

# Read the image and convert to base64
image_path = "generated.png"  # Update this path
with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

# Prepare the request
payload = {
    "image": encoded_string,
    "bbox": {
        "type": "Polygon",
        "coordinates": [
            [
                [103.82822284073663, 1.4117402114449786],
                [103.82822284073663, 1.3942895740942318],
                [103.8562443119285, 1.3942895740942318],
                [103.8562443119285, 1.4117402114449786],
                [103.82822284073663, 1.4117402114449786]
            ]
        ]
    },
    "use_mix": [0.7, 0.2, 0.1],
    "density": [[25, 35], [4, 9], [10, 20]],
    "sigma": 30,
    "falloff_k": 1,
    "w_threshold": 200,
    "b_threshold": 170,
    "simplify_tolerance": 5.0,
    "min_area_ratio": 0.0001
}

# Make the request
response = requests.post(
    "http://localhost:8000/api/py/vectorise",
    json=payload,
    headers={"Content-Type": "application/json"}
)

print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

# Save response to file
with open("vectorise_output.json", "w") as f:
    json.dump(response.json(), f, indent=2)
print("Response saved to vectorise_output.json")