import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { MapLibModule, GOOGLE_PLACES_API_KEY, MAP_LIB_CONFIG, MAPBOX_ACCESS_TOKEN } from 'map-lib';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: GOOGLE_PLACES_API_KEY, useValue: environment.googlePlacesApiKey },
    { provide: MAPBOX_ACCESS_TOKEN, useValue: environment.mapbox.apiKey },
    {
      provide: MAP_LIB_CONFIG, useValue: {
        mapboxApiKey: environment.mapbox.apiKey,
        defaultProvider: 'mapbox'
      }
    }
  ]
};
