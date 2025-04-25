# MapLib

Une bibliothèque Angular pour afficher et gérer des cartes interactives avec Leaflet en utilisant une approche par couches.

## Installation

```bash
npm install map-lib
```

## Configuration

Assurez-vous d'ajouter les styles Leaflet à votre projet en ajoutant la ligne suivante dans le fichier `angular.json`:

```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
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

### Afficher une carte simple

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

### Utiliser le contrôle de couches

```html
<div class="map-container">
  <lib-map [options]="mapOptions"></lib-map>
  <div class="controls">
    <lib-layer-control></lib-layer-control>
  </div>
</div>
```

### Ajouter des couches personnalisées

```typescript
import { Component, OnInit } from '@angular/core';
import { MapService, MapLibOptions } from 'map-lib';
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

## API

### Components

- `MapComponent` - Composant principal pour afficher la carte
- `LayerControlComponent` - Contrôle pour afficher/masquer les couches

### Services

- `MapService` - Service pour gérer les interactions avec la carte

### Interfaces

- `MapLibOptions` - Options de configuration de la carte
- `MapLayer` - Interface pour définir une couche de carte
