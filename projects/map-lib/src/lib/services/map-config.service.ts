import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { MapProviderType } from '../models/map-provider.model';

export interface MapLibConfig {
    mapboxApiKey?: string;
    defaultProvider?: MapProviderType;
    defaultMapStyle?: string;
}

export const MAP_LIB_CONFIG = new InjectionToken<MapLibConfig>('MAP_LIB_CONFIG');

@Injectable({
    providedIn: 'root'
})
export class MapConfigService {
    private config: MapLibConfig = {
        mapboxApiKey: '',
        defaultProvider: MapProviderType.LEAFLET,
        defaultMapStyle: 'mapbox://styles/mapbox/streets-v11'
    };

    constructor(@Optional() @Inject(MAP_LIB_CONFIG) config: MapLibConfig | null) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    get mapboxApiKey(): string {
        return this.config.mapboxApiKey || '';
    }

    get defaultProvider(): MapProviderType {
        return this.config.defaultProvider || MapProviderType.LEAFLET;
    }

    get defaultMapStyle(): string {
        return this.config.defaultMapStyle || 'mapbox://styles/mapbox/streets-v11';
    }
}
