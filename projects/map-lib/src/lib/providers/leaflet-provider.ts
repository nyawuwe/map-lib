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

        // Ajout des différentes couches de base
        const openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        
        const googleStreetLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps',
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });
        
        const googleSatelliteLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps',
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });
        
        const esriWorldImageryLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        const trafficLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
        });

        // Utilisation d'OpenStreetMap comme couche par défaut
        openStreetMapLayer.addTo(this.map);
        
        // Stockage de toutes les couches
        this.layers.set('osm-layer', openStreetMapLayer);
        this.layers.set('google-streets-layer', googleStreetLayer);
        this.layers.set('google-satellite-layer', googleSatelliteLayer);
        this.layers.set('esri-imagery-layer', esriWorldImageryLayer);
        this.layers.set('baseLayer', baseLayer);
        this.layers.set('satellite-layer', satelliteLayer);
        this.layers.set('traffic-layer', trafficLayer);

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
