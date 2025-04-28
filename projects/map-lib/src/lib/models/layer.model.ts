import { Layer, LayerOptions } from 'leaflet';

// Interface générique pour toutes les couches
export interface MapLayer {
    id: string;
    name: string;
    layer: any; // Peut être L.Layer pour Leaflet ou un objet spécifique à Mapbox
    options?: LayerOptions | any;
    enabled: boolean;
    zIndex?: number;
    type?: string; // Type de couche (utile pour les conversions entre fournisseurs)
}

// Interfaces spécifiques pour les couches Mapbox
export interface MapboxSourceLayer {
    type: 'mapbox-source-layer';
    source: any; // Source Mapbox
    layers: any[]; // Couches utilisant cette source
}

export interface MapboxLayer {
    type: 'mapbox-layer';
    layer: any; // Définition de couche Mapbox
}

export interface MapboxMarkerLayer {
    type: 'marker';
    markers: Array<{
        lngLat: [number, number];
        options?: any;
        popup?: {
            html: string;
        };
    }>;
}

export interface MapboxGeoJSONLayer {
    type: 'geojson';
    data: any; // GeoJSON data
    style: {
        type?: string;
        paint?: any;
    };
}
