# MapLib

Une bibliothèque Angular pour afficher et gérer des cartes interactives avec Leaflet ou Mapbox en utilisant une approche par couches.

## Installation

```bash
npm install map-lib
```

## Configuration

### Configuration Leaflet (par défaut)

Assurez-vous d'ajouter les styles Leaflet à votre projet en ajoutant la ligne suivante dans le fichier `angular.json`:

```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "src/styles.css"
],
```

### Configuration Mapbox

Si vous souhaitez utiliser Mapbox, ajoutez le style Mapbox à votre projet dans le fichier `angular.json`:

```json
"styles": [
  "node_modules/mapbox-gl/dist/mapbox-gl.css",
  "src/styles.css"
],
```

## Utilisation

Importez le module `MapLibModule` dans votre module principal:

```typescript
import { MapLibModule } from 'map-lib';

@NgModule({
  imports: [
    // ...
    MapLibModule
  ],
  // ...
})
export class AppModule { }
```

### Afficher une carte simple avec Leaflet (par défaut)

```html
<lib-map [options]="mapOptions"></lib-map>
```

```typescript
import { Component } from '@angular/core';
import { MapLibOptions } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  template: `<lib-map [options]="mapOptions"></lib-map>`
})
export class MapDemoComponent {
  mapOptions: MapLibOptions = {
    center: [48.864716, 2.349014], // Paris
    zoom: 10
  };
}
```

### Afficher une carte avec Mapbox

```html
<lib-map [options]="mapOptions" [providerOptions]="mapProviderOptions"></lib-map>
```

```typescript
import { Component } from '@angular/core';
import { MapLibOptions, MapProviderOptions, MapProviderType } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  template: `<lib-map [options]="mapOptions" [providerOptions]="mapProviderOptions"></lib-map>`
})
export class MapDemoComponent {
  mapOptions: MapLibOptions = {
    center: [48.864716, 2.349014], // Paris
    zoom: 10
  };
  
  mapProviderOptions: MapProviderOptions = {
    type: MapProviderType.MAPBOX,
    apiKey: 'VOTRE_CLE_API_MAPBOX',
    mapStyle: 'mapbox://styles/mapbox/streets-v11'
  };
}
```

### Utiliser le contrôle de couches

Le contrôle de couches fonctionne avec les deux fournisseurs:

```html
<div class="map-container">
  <lib-map [options]="mapOptions" [providerOptions]="mapProviderOptions"></lib-map>
  <div class="controls">
    <lib-layer-control></lib-layer-control>
  </div>
</div>
```

### Ajouter des couches personnalisées avec Leaflet

```typescript
import { Component, OnInit } from '@angular/core';
import { MapService, MapLibOptions, MapProviderType } from 'map-lib';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-demo',
  template: `<lib-map [options]="mapOptions"></lib-map>`
})
export class MapDemoComponent implements OnInit {
  mapOptions: MapLibOptions = {
    center: [48.864716, 2.349014],
    zoom: 10
  };

  constructor(private mapService: MapService) {}

  ngOnInit() {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        // Ajouter une couche de marqueurs
        const markersLayer = L.layerGroup([
          L.marker([48.864716, 2.349014]).bindPopup('Paris'),
          L.marker([48.8566, 2.3522]).bindPopup('Centre de Paris')
        ]);

        this.mapService.addLayer({
          id: 'markers',
          name: 'Points d\'intérêt',
          layer: markersLayer,
          enabled: true
        });
      }
    });
  }
}
```

### Ajouter des couches personnalisées avec Mapbox

```typescript
import { Component, OnInit } from '@angular/core';
import { MapService, MapLibOptions, MapProviderOptions, MapProviderType } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  template: `<lib-map [options]="mapOptions" [providerOptions]="mapProviderOptions"></lib-map>`
})
export class MapDemoComponent implements OnInit {
  mapOptions: MapLibOptions = {
    center: [48.864716, 2.349014],
    zoom: 10
  };

  mapProviderOptions: MapProviderOptions = {
    type: MapProviderType.MAPBOX,
    apiKey: 'VOTRE_CLE_API_MAPBOX',
    mapStyle: 'mapbox://styles/mapbox/streets-v11'
  };

  constructor(private mapService: MapService) {}

  ngOnInit() {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        // Ajouter une couche de marqueurs
        const markersLayer = {
          type: 'marker',
          markers: [
            {
              lngLat: [2.349014, 48.864716], // [lng, lat] pour Mapbox
              popup: { html: 'Paris' }
            },
            {
              lngLat: [2.3522, 48.8566], // [lng, lat] pour Mapbox
              popup: { html: 'Centre de Paris' }
            }
          ]
        };

        this.mapService.addLayer({
          id: 'markers',
          name: 'Points d\'intérêt',
          layer: markersLayer,
          enabled: true,
          type: 'marker'
        });

        // Ajouter une couche GeoJSON
        const geojsonLayer = {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [2.3, 48.9]
                },
                properties: {
                  name: 'Point 1'
                }
              }
            ]
          },
          style: {
            type: 'circle',
            paint: {
              'circle-radius': 8,
              'circle-color': '#FF0000'
            }
          }
        };

        this.mapService.addLayer({
          id: 'geojson-points',
          name: 'Points GeoJSON',
          layer: geojsonLayer,
          enabled: true,
          type: 'geojson'
        });
      }
    });
  }
}
```

## API

### Components

- `MapComponent` - Composant principal pour afficher la carte
- `LayerControlComponent` - Contrôle pour afficher/masquer les couches

### Services

- `MapService` - Service pour gérer les interactions avec la carte

### Interfaces

- `MapLibOptions` - Options de configuration de la carte
- `MapLayer` - Interface pour définir une couche de carte
- `MapProviderOptions` - Options pour configurer le fournisseur de carte
- `MapProviderType` - Enum pour choisir entre Leaflet et Mapbox
