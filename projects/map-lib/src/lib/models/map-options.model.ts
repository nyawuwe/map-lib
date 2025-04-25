import { LatLngExpression, Map as LeafletMap, MapOptions } from 'leaflet';

export interface MapLibOptions {
    center?: LatLngExpression;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    layers?: any[];
    options?: MapOptions;
}
