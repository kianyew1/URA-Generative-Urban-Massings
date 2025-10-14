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

export const CLAUDE_GENERATION = {
  type: "FeatureCollection",
  name: "Sembawang Shipyard Redevelopment - Urban Massing Study",
  crs: {
    type: "name",
    properties: {
      name: "urn:ogc:def:crs:OGC:1.3:CRS84",
    },
  },
  features: [
    {
      type: "Feature",
      properties: {
        building_type: "Heritage Dock",
        name: "King George VI Graving Dock (Sunken Plaza)",
        height: -12,
        floors: 0,
        use: "Public Plaza & Recreation",
        color: [70, 130, 180],
        density: 0,
        notes: "Historic 305m graving dock converted to sunken public space",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8195, 1.4685],
            [103.82255, 1.4685],
            [103.82255, 1.4673],
            [103.8195, 1.4673],
            [103.8195, 1.4685],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Waterfront Promenade",
        name: "Waterfront Boulevard",
        height: 0,
        floors: 0,
        use: "Public Realm",
        color: [34, 139, 34],
        density: 0,
        notes: "15m wide waterfront promenade with F&B and viewing decks",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8185, 1.4695],
            [103.824, 1.4695],
            [103.824, 1.469],
            [103.8185, 1.469],
            [103.8185, 1.4695],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Low-Rise Commercial",
        name: "Maritime Heritage Pavilion A",
        height: 12,
        floors: 3,
        use: "F&B, Retail, Museum",
        color: [210, 180, 140],
        density: 150,
        notes: "Adaptive reuse of naval workshop structures",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.819, 1.4688],
            [103.82, 1.4688],
            [103.82, 1.4682],
            [103.819, 1.4682],
            [103.819, 1.4688],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Low-Rise Commercial",
        name: "Maritime Heritage Pavilion B",
        height: 12,
        floors: 3,
        use: "Creative Studios, Cafes",
        color: [210, 180, 140],
        density: 150,
        notes: "Preserved naval administrative buildings",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8208, 1.4688],
            [103.8218, 1.4688],
            [103.8218, 1.4682],
            [103.8208, 1.4682],
            [103.8208, 1.4688],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Low-Rise Commercial",
        name: "Waterfront Market & F&B",
        height: 15,
        floors: 4,
        use: "Market, F&B, Retail",
        color: [222, 184, 135],
        density: 180,
        notes: "Active waterfront ground floor",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8226, 1.4688],
            [103.8236, 1.4688],
            [103.8236, 1.4682],
            [103.8226, 1.4682],
            [103.8226, 1.4688],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Mid-Rise Mixed Use",
        name: "Dockside Terraces A",
        height: 28,
        floors: 8,
        use: "Residential, Retail",
        color: [188, 143, 143],
        density: 280,
        notes: "Terraced design stepping back from water",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.819, 1.4678],
            [103.8202, 1.4678],
            [103.8202, 1.467],
            [103.819, 1.467],
            [103.819, 1.4678],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Mid-Rise Mixed Use",
        name: "Dockside Terraces B",
        height: 28,
        floors: 8,
        use: "Residential, Retail",
        color: [188, 143, 143],
        density: 280,
        notes: "Stepped massing with sky terraces",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8205, 1.4678],
            [103.8217, 1.4678],
            [103.8217, 1.467],
            [103.8205, 1.467],
            [103.8205, 1.4678],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Mid-Rise Mixed Use",
        name: "Dockside Terraces C",
        height: 28,
        floors: 8,
        use: "Residential, Community",
        color: [188, 143, 143],
        density: 280,
        notes: "Waterfront views with communal gardens",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.822, 1.4678],
            [103.8232, 1.4678],
            [103.8232, 1.467],
            [103.822, 1.467],
            [103.822, 1.4678],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Mid-Rise Office",
        name: "Innovation Hub A",
        height: 42,
        floors: 12,
        use: "Office, Co-working",
        color: [100, 149, 237],
        density: 350,
        notes: "Technology and creative industries",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8192, 1.4666],
            [103.8204, 1.4666],
            [103.8204, 1.4658],
            [103.8192, 1.4658],
            [103.8192, 1.4666],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Mid-Rise Office",
        name: "Innovation Hub B",
        height: 42,
        floors: 12,
        use: "Office, R&D",
        color: [100, 149, 237],
        density: 350,
        notes: "Maritime tech and logistics companies",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8218, 1.4666],
            [103.823, 1.4666],
            [103.823, 1.4658],
            [103.8218, 1.4658],
            [103.8218, 1.4666],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "High-Rise Residential",
        name: "Naval Heights Tower A",
        height: 70,
        floors: 20,
        use: "Residential",
        color: [165, 105, 105],
        density: 450,
        notes: "Slender tower with heritage-inspired facade",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8194, 1.4653],
            [103.8202, 1.4653],
            [103.8202, 1.4645],
            [103.8194, 1.4645],
            [103.8194, 1.4653],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "High-Rise Residential",
        name: "Naval Heights Tower B",
        height: 77,
        floors: 22,
        use: "Residential",
        color: [165, 105, 105],
        density: 480,
        notes: "Point tower with 360-degree views",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8206, 1.4652],
            [103.8213, 1.4652],
            [103.8213, 1.4645],
            [103.8206, 1.4645],
            [103.8206, 1.4652],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "High-Rise Residential",
        name: "Naval Heights Tower C",
        height: 70,
        floors: 20,
        use: "Residential",
        color: [165, 105, 105],
        density: 450,
        notes: "Waterfront orientation with sky gardens",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8217, 1.4653],
            [103.8225, 1.4653],
            [103.8225, 1.4645],
            [103.8217, 1.4645],
            [103.8217, 1.4653],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "High-Rise Mixed Use",
        name: "Sembawang Central Tower A",
        height: 98,
        floors: 28,
        use: "Office, Hotel, Retail",
        color: [72, 118, 165],
        density: 600,
        notes: "Transit-oriented development near MRT",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8196, 1.464],
            [103.8204, 1.464],
            [103.8204, 1.4632],
            [103.8196, 1.4632],
            [103.8196, 1.464],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "High-Rise Mixed Use",
        name: "Sembawang Central Tower B",
        height: 105,
        floors: 30,
        use: "Office, Residential",
        color: [72, 118, 165],
        density: 650,
        notes: "Landmark tower with sustainable features",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8208, 1.4639],
            [103.8215, 1.4639],
            [103.8215, 1.4632],
            [103.8208, 1.4632],
            [103.8208, 1.4639],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "High-Rise Mixed Use",
        name: "Sembawang Central Tower C",
        height: 98,
        floors: 28,
        use: "Office, Medical Hub",
        color: [72, 118, 165],
        density: 600,
        notes: "Integrated healthcare and wellness",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8219, 1.464],
            [103.8227, 1.464],
            [103.8227, 1.4632],
            [103.8219, 1.4632],
            [103.8219, 1.464],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Community",
        name: "Central Green",
        height: 0,
        floors: 0,
        use: "Park, Community Space",
        color: [60, 179, 113],
        density: 0,
        notes: "3-hectare central park with rain gardens",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8204, 1.4663],
            [103.8218, 1.4663],
            [103.8218, 1.4654],
            [103.8204, 1.4654],
            [103.8204, 1.4663],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Infrastructure",
        name: "Transit Boulevard",
        height: 0,
        floors: 0,
        use: "Transportation",
        color: [169, 169, 169],
        density: 0,
        notes: "30m wide boulevard connecting to Sembawang MRT",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.8232, 1.469],
            [103.8238, 1.469],
            [103.8238, 1.463],
            [103.8232, 1.463],
            [103.8232, 1.469],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Low-Rise Community",
        name: "Sembawang Arts & Culture Centre",
        height: 18,
        floors: 4,
        use: "Community, Arts, Library",
        color: [205, 133, 63],
        density: 200,
        notes: "Maritime heritage museum and community center",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.82, 1.4628],
            [103.8212, 1.4628],
            [103.8212, 1.462],
            [103.82, 1.462],
            [103.82, 1.4628],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        building_type: "Floating Dock",
        name: "Historic Floating Dock (Retained)",
        height: 8,
        floors: 2,
        use: "Events, Exhibition",
        color: [95, 95, 95],
        density: 100,
        notes: "Preserved floating dock for events and maritime heritage",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.818, 1.4678],
            [103.8186, 1.4678],
            [103.8186, 1.4665],
            [103.818, 1.4665],
            [103.818, 1.4678],
          ],
        ],
      },
    },
  ],
  metadata: {
    project: "Sembawang Shipyard Redevelopment",
    client: "Urban Redevelopment Authority of Singapore",
    site_area_ha: 31.2,
    total_gfa_sqm: 785000,
    residential_units: 3500,
    office_gfa_sqm: 180000,
    retail_gfa_sqm: 45000,
    design_principles: [
      "Stepped massing from waterfront (12m) to inland (105m)",
      "Preservation of King George VI Graving Dock as public space",
      "15m continuous waterfront promenade",
      "Heritage-sensitive design referencing naval architecture",
      "Transit-oriented development around Sembawang MRT",
      "30% green coverage with central park",
      "Mixed-use integration for 24/7 activation",
    ],
    height_zones: {
      "waterfront_0-50m": "3-4 storeys (12-15m) - Heritage pavilions, F&B",
      "transition_50-150m":
        "8-12 storeys (28-42m) - Mid-rise residential and office",
      "inland_150m+":
        "20-30 storeys (70-105m) - High-rise residential and commercial",
    },
    sustainability: [
      "Rainwater harvesting in sunken dock plaza",
      "Rooftop solar on all buildings",
      "District cooling system",
      "Green roofs and vertical gardens",
      "Car-lite design with priority for cycling and walking",
    ],
    coordinates_note:
      "WGS84 coordinates centered on actual Sembawang Shipyard location (1.468°N, 103.820°E)",
  },
};
