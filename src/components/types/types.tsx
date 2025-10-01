export interface GeoJsonFeatureProperties {
  elevation: number;
  type: string;
}

// Layer Control Sidebar Component
export interface LayerControlProps {
  isOpen: boolean;
  onToggle: () => void;
  layersVisible: Record<string, boolean>;
  onLayerToggle: (layerName: string) => void;
}
