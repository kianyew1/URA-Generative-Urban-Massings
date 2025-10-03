export const getBuildingColor = (type: string) => {
  switch (type) {
    case "residential":
      return [70, 130, 180, 150];
    case "commercial":
      return [255, 165, 0, 150];
    case "mixed_use":
      return [147, 112, 219, 150];
    case "shophouse":
      return [255, 69, 0, 150];
    case "industrial":
      return [128, 128, 128, 150];
    default:
      return [255, 0, 0, 150];
  }
};

// Urban massing for Sembawang waterfront area
export const GEOJSON_DATA = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.819, 1.456],
            [103.819, 1.4565],
            [103.8195, 1.4565],
            [103.8195, 1.456],
            [103.819, 1.456],
          ],
        ],
      },
      properties: {
        elevation: 120,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.82, 1.4558],
            [103.82, 1.4563],
            [103.8205, 1.4563],
            [103.8205, 1.4558],
            [103.82, 1.4558],
          ],
        ],
      },
      properties: {
        elevation: 135,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8185, 1.4548],
            [103.8185, 1.4552],
            [103.8192, 1.4552],
            [103.8192, 1.4548],
            [103.8185, 1.4548],
          ],
        ],
      },
      properties: {
        elevation: 60,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8198, 1.4545],
            [103.8198, 1.455],
            [103.8203, 1.455],
            [103.8203, 1.4545],
            [103.8198, 1.4545],
          ],
        ],
      },
      properties: {
        elevation: 45,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8205, 1.4552],
            [103.8205, 1.4557],
            [103.8215, 1.4557],
            [103.8215, 1.4552],
            [103.8205, 1.4552],
          ],
        ],
      },
      properties: {
        elevation: 80,
        type: "mixed_use",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.818, 1.454],
            [103.818, 1.4544],
            [103.8188, 1.4544],
            [103.8188, 1.454],
            [103.818, 1.454],
          ],
        ],
      },
      properties: {
        elevation: 15,
        type: "shophouse",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.819, 1.4538],
            [103.819, 1.4542],
            [103.8197, 1.4542],
            [103.8197, 1.4538],
            [103.819, 1.4538],
          ],
        ],
      },
      properties: {
        elevation: 18,
        type: "shophouse",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8175, 1.4535],
            [103.8175, 1.4542],
            [103.8185, 1.4542],
            [103.8185, 1.4535],
            [103.8175, 1.4535],
          ],
        ],
      },
      properties: {
        elevation: 25,
        type: "industrial",
      },
    },
  ],
};

export const THIRD_GENERATION = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.823, 1.461],
            [103.823, 1.4615],
            [103.8237, 1.4615],
            [103.8237, 1.461],
            [103.823, 1.461],
          ],
        ],
      },
      properties: {
        elevation: 20,
        type: "shophouse",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.824, 1.4612],
            [103.824, 1.4617],
            [103.8247, 1.4617],
            [103.8247, 1.4612],
            [103.824, 1.4612],
          ],
        ],
      },
      properties: {
        elevation: 18,
        type: "shophouse",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.825, 1.4614],
            [103.825, 1.462],
            [103.8258, 1.462],
            [103.8258, 1.4614],
            [103.825, 1.4614],
          ],
        ],
      },
      properties: {
        elevation: 55,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8261, 1.4616],
            [103.8261, 1.4622],
            [103.8268, 1.4622],
            [103.8268, 1.4616],
            [103.8261, 1.4616],
          ],
        ],
      },
      properties: {
        elevation: 95,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8271, 1.4618],
            [103.8271, 1.4624],
            [103.8278, 1.4624],
            [103.8278, 1.4618],
            [103.8271, 1.4618],
          ],
        ],
      },
      properties: {
        elevation: 88,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8281, 1.462],
            [103.8281, 1.4626],
            [103.829, 1.4626],
            [103.829, 1.462],
            [103.8281, 1.462],
          ],
        ],
      },
      properties: {
        elevation: 75,
        type: "mixed_use",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8293, 1.4622],
            [103.8293, 1.4628],
            [103.83, 1.4628],
            [103.83, 1.4622],
            [103.8293, 1.4622],
          ],
        ],
      },
      properties: {
        elevation: 110,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8303, 1.4624],
            [103.8303, 1.463],
            [103.831, 1.463],
            [103.831, 1.4624],
            [103.8303, 1.4624],
          ],
        ],
      },
      properties: {
        elevation: 105,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8313, 1.4626],
            [103.8313, 1.4632],
            [103.8322, 1.4632],
            [103.8322, 1.4626],
            [103.8313, 1.4626],
          ],
        ],
      },
      properties: {
        elevation: 68,
        type: "mixed_use",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8325, 1.4628],
            [103.8325, 1.4634],
            [103.8332, 1.4634],
            [103.8332, 1.4628],
            [103.8325, 1.4628],
          ],
        ],
      },
      properties: {
        elevation: 92,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.826, 1.4608],
            [103.826, 1.4613],
            [103.8268, 1.4613],
            [103.8268, 1.4608],
            [103.826, 1.4608],
          ],
        ],
      },
      properties: {
        elevation: 48,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8271, 1.461],
            [103.8271, 1.4615],
            [103.828, 1.4615],
            [103.828, 1.461],
            [103.8271, 1.461],
          ],
        ],
      },
      properties: {
        elevation: 65,
        type: "mixed_use",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8283, 1.4612],
            [103.8283, 1.4617],
            [103.829, 1.4617],
            [103.829, 1.4612],
            [103.8283, 1.4612],
          ],
        ],
      },
      properties: {
        elevation: 72,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8293, 1.4614],
            [103.8293, 1.4619],
            [103.8301, 1.4619],
            [103.8301, 1.4614],
            [103.8293, 1.4614],
          ],
        ],
      },
      properties: {
        elevation: 58,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8304, 1.4616],
            [103.8304, 1.4621],
            [103.8312, 1.4621],
            [103.8312, 1.4616],
            [103.8304, 1.4616],
          ],
        ],
      },
      properties: {
        elevation: 82,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8315, 1.4618],
            [103.8315, 1.4623],
            [103.8323, 1.4623],
            [103.8323, 1.4618],
            [103.8315, 1.4618],
          ],
        ],
      },
      properties: {
        elevation: 78,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.825, 1.4602],
            [103.825, 1.4607],
            [103.8258, 1.4607],
            [103.8258, 1.4602],
            [103.825, 1.4602],
          ],
        ],
      },
      properties: {
        elevation: 42,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8261, 1.46],
            [103.8261, 1.4605],
            [103.827, 1.4605],
            [103.827, 1.46],
            [103.8261, 1.46],
          ],
        ],
      },
      properties: {
        elevation: 38,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8273, 1.4598],
            [103.8273, 1.4603],
            [103.8281, 1.4603],
            [103.8281, 1.4598],
            [103.8273, 1.4598],
          ],
        ],
      },
      properties: {
        elevation: 85,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8284, 1.4596],
            [103.8284, 1.4601],
            [103.8292, 1.4601],
            [103.8292, 1.4596],
            [103.8284, 1.4596],
          ],
        ],
      },
      properties: {
        elevation: 100,
        type: "residential",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8295, 1.4594],
            [103.8295, 1.4599],
            [103.8303, 1.4599],
            [103.8303, 1.4594],
            [103.8295, 1.4594],
          ],
        ],
      },
      properties: {
        elevation: 70,
        type: "mixed_use",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8306, 1.4592],
            [103.8306, 1.4597],
            [103.8315, 1.4597],
            [103.8315, 1.4592],
            [103.8306, 1.4592],
          ],
        ],
      },
      properties: {
        elevation: 50,
        type: "commercial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8318, 1.459],
            [103.8318, 1.4595],
            [103.8326, 1.4595],
            [103.8326, 1.459],
            [103.8318, 1.459],
          ],
        ],
      },
      properties: {
        elevation: 65,
        type: "mixed_use",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.824, 1.4585],
            [103.824, 1.459],
            [103.8248, 1.459],
            [103.8248, 1.4585],
            [103.824, 1.4585],
          ],
        ],
      },
      properties: {
        elevation: 28,
        type: "industrial",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8251, 1.4583],
            [103.8251, 1.4588],
            [103.826, 1.4588],
            [103.826, 1.4583],
            [103.8251, 1.4583],
          ],
        ],
      },
      properties: {
        elevation: 32,
        type: "industrial",
      },
    },
  ],
};
