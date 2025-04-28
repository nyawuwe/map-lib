import { Injectable } from '@angular/core';
import { MapProvider, MapProviderOptions, MapProviderType } from '../models/map-provider.model';
import { LeafletProvider } from './leaflet-provider';
import { MapboxProvider } from './mapbox-provider';

@Injectable({
    providedIn: 'root'
})
export class MapProviderFactory {
    createProvider(options: MapProviderOptions): MapProvider {
        switch (options.type) {
            case MapProviderType.LEAFLET:
                return new LeafletProvider();
            case MapProviderType.MAPBOX:
                return new MapboxProvider();
            default:
                throw new Error(`Fournisseur de carte non supporté: ${options.type}`);
        }
    }
}
