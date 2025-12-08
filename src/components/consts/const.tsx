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
    case "office":
      return [128, 128, 128, 150];
    default:
      return [255, 0, 0, 150];
  }
};

// Basemap options
export const BASEMAPS = {
  positron: {
    name: "Positron (No Labels)",
    url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
  },
  positronLabels: {
    name: "Positron",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  darkMatter: {
    name: "Dark Matter",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  voyager: {
    name: "Voyager",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  voyager_nolabels: {
    name: "Voyager (No Labels)",
    url: "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json",
  },
  osm: {
    name: "OpenStreetMap",
    // Alternative free OSM source that works in production
    url: "https://api.maptiler.com/maps/openstreetmap/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
  },
  satellite: {
    name: "Satellite",
    // Alternative free satellite source
    url: "https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
  },
};

// Color mapping for Singapore URA Master Plan land use types [R, G, B, OPACITY]
export const LAND_USE_COLORS: Record<string, [number, number, number, number]> =
  {
    RESIDENTIAL: [255, 255, 255, 255],
    "RESIDENTIAL WITH COMMERCIAL AT 1ST STOREY": [255, 255, 255, 255],
    COMMERCIAL: [255, 255, 255, 255],
    "COMMERCIAL & RESIDENTIAL": [255, 255, 255, 255],
    "BUSINESS 1": [255, 255, 255, 255],
    "BUSINESS 2": [255, 255, 255, 255],
    "BUSINESS PARK": [44, 162, 95, 255],
    HOTEL: [153, 112, 171, 255],
    WHITE: [255, 255, 255, 255],
    "EDUCATIONAL INSTITUTION": [255, 255, 255, 255],
    "PLACE OF WORSHIP": [255, 255, 255, 255],
    "CIVIC & COMMUNITY INSTITUTION": [255, 255, 255, 255],
    "HEALTH & MEDICAL CARE": [255, 255, 255, 255],
    "OPEN SPACE": [255, 255, 255, 255],
    PARK: [35, 139, 69, 255],
    "RESERVE SITE": [255, 255, 255, 255],
    WATERBODY: [44, 127, 184, 255],
    ROAD: [200, 200, 200, 255],
    "RAPID TRANSIT SYSTEM": [128, 128, 128, 255],
    "PORT / AIRPORT": [255, 255, 255, 255],
    UTILITY: [255, 255, 255, 255],
    CEMETERY: [166, 97, 26, 255],
    "SPECIAL USE": [255, 255, 255, 255],
    AGRICULTURE: [140, 81, 10, 255],
    "SPORTS & RECREATION": [255, 255, 255, 255],
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
        type: "office",
      },
    },
  ],
};
