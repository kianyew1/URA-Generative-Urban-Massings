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
