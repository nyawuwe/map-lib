import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { MapLibModule, GOOGLE_PLACES_API_KEY } from 'map-lib';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: GOOGLE_PLACES_API_KEY, useValue: environment.googlePlacesApiKey }
  ]
};
