import { Layer, LayerOptions } from 'leaflet';

export interface MapLayer {
    id: string;
    name: string;
    layer: Layer;
    options?: LayerOptions;
    enabled: boolean;
    zIndex?: number;
}
