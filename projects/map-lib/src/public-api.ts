/*
 * Public API Surface of map-lib
 */

export * from './lib/map-lib.module';
export * from './lib/components/map/map.component';
export * from './lib/components/layer-control/layer-control.component';
export * from './lib/components/popup/popup.component';
export * from './lib/components/map-controls/map-controls.component';
export * from './lib/components/plus-code-card/plus-code-card.component';
export * from './lib/components/places-search/places-search.component';
export * from './lib/components/toast/toast.component';

export * from './lib/services/map.service';
export * from './lib/services/icon.service';
export * from './lib/services/popup.service';
export * from './lib/services/popup-actions.service';
export * from './lib/services/asset.service';
export * from './lib/services/places.service';
export * from './lib/services/map-config.service';
export * from './lib/services/toast.service';

export * from './lib/models/map-options.model';
export * from './lib/models/layer.model';
export * from './lib/models/popup-info.model';
export * from './lib/models/map-provider.model';
export * from './lib/models/layer-info.model';

export * from './lib/providers/map-provider.factory';
export * from './lib/providers/leaflet-provider';
export * from './lib/providers/mapbox-provider';

// Exporter les jetons d'injection pour les clés d'API
export { GOOGLE_PLACES_API_KEY, MAPBOX_ACCESS_TOKEN } from './lib/services/places.service';
export { PlusCodeService, PLUS_CODE_API_URL } from './lib/services/plus-code.service';
