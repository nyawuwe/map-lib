import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { MapDemoComponent } from './map-demo/map-demo.component';
// Importer la bibliothèque map-lib
import { MapLibModule } from 'map-lib';
import { environment } from '../environments/environment';

@NgModule({
    declarations: [
        AppComponent,
        MapDemoComponent
    ],
    imports: [
        BrowserModule,
        MapLibModule.forRoot({
            mapboxApiKey: environment.mapbox.apiKey,
            defaultProvider: 'mapbox' // Utiliser la valeur directe pour éviter les problèmes d'import
        }, environment.googlePlacesApiKey) // Configurer avec les clés API
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
