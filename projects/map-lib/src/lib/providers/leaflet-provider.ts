import * as L from 'leaflet';
import { MapProvider, MapProviderOptions } from '../models/map-provider.model';
import { MapLibOptions } from '../models/map-options.model';

export class LeafletProvider implements MapProvider {
    private map: L.Map | null = null;
    private layers: Map<string, L.Layer> = new Map();

    initialize(element: HTMLElement, options: MapProviderOptions): L.Map {
        const leafletOptions = options.leafletOptions || {};
        const defaultOptions: MapLibOptions = {
            center: [48.864716, 2.349014],
            zoom: 5,
            minZoom: 3,
            maxZoom: 18
        };

        const mergedOptions = { ...defaultOptions, ...leafletOptions };

        this.map = L.map(element, {
            center: mergedOptions.center,
            zoom: mergedOptions.zoom,
            minZoom: mergedOptions.minZoom,
            maxZoom: mergedOptions.maxZoom,
            zoomControl: false,
            ...mergedOptions.options
        });

        // Ajout d'une couche de base (OpenStreetMap)
        const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        baseLayer.addTo(this.map);
        this.layers.set('base-layer', baseLayer);

        return this.map;
    }

    addLayer(layerId: string, layer: L.Layer, enabled: boolean): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        this.layers.set(layerId, layer);

        if (enabled) {
            layer.addTo(this.map);
        }
    }

    removeLayer(layerId: string): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        const layer = this.layers.get(layerId);
        if (layer) {
            this.map.removeLayer(layer);
            this.layers.delete(layerId);
        }
    }

    toggleLayer(layerId: string, visible: boolean): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        const layer = this.layers.get(layerId);
        if (layer) {
            if (visible) {
                this.map.addLayer(layer);
            } else {
                this.map.removeLayer(layer);
            }
        }
    }

    fitBounds(bounds: L.LatLngBoundsExpression): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        this.map.fitBounds(bounds);
    }

    setView(center: L.LatLngExpression, zoom?: number): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        this.map.setView(center, zoom);
    }

    resize(): void {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    destroy(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.layers.clear();
    }

    getUnderlyingMap(): L.Map | null {
        return this.map;
    }
}
