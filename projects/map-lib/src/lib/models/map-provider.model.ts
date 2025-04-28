import { LatLngExpression } from 'leaflet';
import { MapLibOptions } from './map-options.model';

export enum MapProviderType {
    LEAFLET = 'leaflet',
    MAPBOX = 'mapbox'
}

export interface MapProviderOptions {
    type: MapProviderType;
    apiKey?: string;  // Nécessaire pour Mapbox
    mapStyle?: string; // Style Mapbox (par exemple: 'mapbox://styles/mapbox/streets-v11')
    leafletOptions?: MapLibOptions;
}

export interface MapProvider {
    initialize(element: HTMLElement, options: MapProviderOptions): any;
    addLayer(layerId: string, layer: any, enabled: boolean): void;
    removeLayer(layerId: string): void;
    toggleLayer(layerId: string, visible: boolean): void;
    fitBounds(bounds: any): void;
    setView(center: LatLngExpression, zoom?: number): void;
    resize(): void;
    destroy(): void;
    getUnderlyingMap(): any;
}
