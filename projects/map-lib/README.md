# MapLib

Une bibliothèque Angular pour afficher et gérer des cartes interactives avec Leaflet ou Mapbox en utilisant une approche par couches.

## Installation

```bash
npm build map-lib
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

### Configuration Font Awesome (pour les icônes personnalisées)

Pour utiliser des icônes Font Awesome dans vos marqueurs, ajoutez Font Awesome à votre projet :

```json
"styles": [
  "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
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

Pour les applications en standalone (Angular 14+) :

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapLibModule } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  standalone: true,
  imports: [CommonModule, MapLibModule],
  templateUrl: './map-demo.component.html',
  styleUrls: ['./map-demo.component.css']
})
export class MapDemoComponent {
  // ...
}
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

### Utiliser le composant de recherche de lieux

Le composant de recherche de lieux permet de rechercher des adresses et points d'intérêt, et de centrer la carte sur ces lieux.

```html
<div class="demo-container">
  <div class="map-container">
    <lib-map [options]="mapOptions" #mapComponent></lib-map>
    <div class="controls">
      <lib-layer-control></lib-layer-control>
    </div>
    <lib-places-search [map]="mapComponent?.map ?? null"></lib-places-search>
  </div>
</div>
```

```typescript
import { Component, ViewChild } from '@angular/core';
import { MapLibOptions } from 'map-lib';
import { MapComponent } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  templateUrl: './map-demo.component.html',
  styleUrls: ['./map-demo.component.css']
})
export class MapDemoComponent {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  mapOptions: MapLibOptions = {
    center: [46.603354, 1.888334], // Centre de la France
    zoom: 6
  };
}
```

### Ajouter des marqueurs avec des icônes personnalisées

Vous pouvez utiliser le service `IconService` pour créer des marqueurs avec des icônes personnalisées basées sur Font Awesome:

```typescript
import { Component, OnInit } from '@angular/core';
import { MapService, IconService, PopupInfo } from 'map-lib';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-demo',
  templateUrl: './map-demo.component.html'
})
export class MapDemoComponent implements OnInit {
  constructor(
    private mapService: MapService,
    private iconService: IconService
  ) { }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.addCustomMarkers();
      }
    });
  }

  addCustomMarkers(): void {
    // Créer des informations pour le popup
    const parisInfo: PopupInfo = {
      title: 'Paris',
      description: 'La ville lumière, capitale de la France.',
      details: {
        'Population': '2,2 millions',
        'Altitude': '35m',
        'Superficie': '105,4 km²',
        'Fondation': '52 av. J.-C.'
      }
    };

    // Créer un marqueur avec une icône personnalisée
    const parisMarker = this.iconService.createMarkerWithIcon(
      [48.864716, 2.349014], // Coordonnées
      {
        iconClass: 'fas fa-monument', // Classe d'icône Font Awesome
        markerColor: '#e74c3c', // Couleur du marqueur
        iconColor: 'white' // Couleur de l'icône
      },
      parisInfo // Informations pour le popup
    );

    // Créer une couche avec le marqueur
    const markersLayer = L.layerGroup([parisMarker]);

    // Ajouter la couche à la carte
    this.mapService.addLayer({
      id: 'cities',
      name: 'Villes',
      layer: markersLayer,
      enabled: true,
      zIndex: 1
    });
  }
}
```

### Ajouter des formes géométriques

```typescript
addCustomLayers(): void {
  // Ajouter un polygone
  const polygon = L.polygon([
    [48.8, 2.0],
    [48.9, 2.5],
    [48.5, 2.6],
    [48.4, 2.2]
  ], { color: '#9b59b6', fillOpacity: 0.3 });

  // Ajouter la couche à la carte
  this.mapService.addLayer({
    id: 'region',
    name: 'Région d\'exemple',
    layer: polygon,
    enabled: false,
    zIndex: 2
  });
}
```

## API

### Components

- `MapComponent` - Composant principal pour afficher la carte
- `LayerControlComponent` - Contrôle pour afficher/masquer les couches
- `PlacesSearchComponent` - Composant de recherche de lieux et d'adresses

### Services

- `MapService` - Service pour gérer les interactions avec la carte
- `IconService` - Service pour créer des marqueurs avec des icônes personnalisées
- `PopupService` - Service pour créer des popups personnalisés
- `PlacesService` - Service pour rechercher des lieux et adresses

### Interfaces

- `MapLibOptions` - Options de configuration de la carte
- `MapLayer` - Interface pour définir une couche de carte
- `MapProviderOptions` - Options pour configurer le fournisseur de carte
- `MapProviderType` - Enum pour choisir entre Leaflet et Mapbox
- `PopupInfo` - Interface pour définir les informations d'un popup
- `IconOptions` - Options pour configurer une icône personnalisée
- `Place` - Interface pour les lieux trouvés par la recherche
- `PlaceSuggestion` - Interface pour les suggestions de recherche

## Exemples avancés

### Utilisation complète avec toutes les fonctionnalités

```html
<div class="demo-container">
  <h2>Carte interactive avec recherche</h2>
  <div class="map-container">
    <lib-map [options]="mapOptions" #mapComponent></lib-map>
    <div class="controls">
      <lib-layer-control></lib-layer-control>
    </div>
    <lib-places-search [map]="mapComponent?.map ?? null" (placeSelected)="onPlaceSelected($event)"></lib-places-search>
  </div>
</div>
```

```typescript
import { Component, OnInit, ViewChild } from '@angular/core';
import { MapComponent, MapService, IconService, PopupInfo, Place } from 'map-lib';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-demo',
  templateUrl: './map-demo.component.html',
  styleUrls: ['./map-demo.component.css']
})
export class MapDemoComponent implements OnInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  mapOptions = {
    center: [46.603354, 1.888334], // Centre de la France
    zoom: 6
  };

  constructor(
    private mapService: MapService,
    private iconService: IconService
  ) { }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.addCustomLayers();
      }
    });
  }

  onPlaceSelected(place: Place): void {
    console.log('Lieu sélectionné:', place);
    // Actions supplémentaires lorsqu'un lieu est sélectionné
  }

  addCustomLayers(): void {
    // Création de marqueurs personnalisés comme dans les exemples précédents
    // ...
  }
}
```

## Notes de compatibilité

- Compatible avec Angular 13+
- Support de Leaflet 1.7+ et Mapbox GL JS 2.0+
- Nécessite Font Awesome 5+ pour les icônes personnalisées
