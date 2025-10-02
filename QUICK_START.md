# Guide de Démarrage Rapide 🚀

Ce guide vous aidera à démarrer rapidement avec **MapxAngular** et **map-lib**.

## 📦 Installation en 3 minutes

### Prérequis

- Node.js 18+
- npm 9+
- Angular CLI 18+

### Étape 1 : Installation

```bash
# Cloner le repository
git clone https://github.com/nyawuwe/map-lib.git
cd MapxAngular

# Installer les dépendances
npm install

# Compiler la bibliothèque
npm run build map-lib

# Lancer la démo
npm start
```

Rendez-vous sur `http://localhost:4200/` 🎉

## 🎯 Utiliser map-lib dans votre projet

### 1. Installer la bibliothèque

```bash
npm install map-lib
npm install @angular/animations @angular/common @angular/core
npm install @phosphor-icons/web leaflet mapbox-gl
```

### 2. Configurer angular.json

```json
{
  "styles": [
    "node_modules/leaflet/dist/leaflet.css",
    "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
    "src/styles.css"
  ]
}
```

### 3. Importer le module

```typescript
// app.module.ts ou app.config.ts
import { MapLibModule } from 'map-lib';

@NgModule({
  imports: [
    // ...
    MapLibModule
  ]
})
export class AppModule { }
```

### 4. Utiliser dans votre composant

#### Template (HTML)

```html
<div class="map-container">
  <lib-map [options]="mapOptions"></lib-map>
</div>
```

#### Composant (TypeScript)

```typescript
import { Component } from '@angular/core';
import { MapLibOptions } from 'map-lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  mapOptions: MapLibOptions = {
    center: [48.8566, 2.3522], // Paris
    zoom: 13
  };
}
```

#### Styles (CSS)

```css
.map-container {
  width: 100%;
  height: 500px;
}
```

## ✨ Fonctionnalités de base

### Ajouter un contrôle de couches

```html
<div class="map-wrapper">
  <lib-map [options]="mapOptions"></lib-map>
  <lib-layer-control></lib-layer-control>
</div>
```

### Ajouter la recherche de lieux

```html
<lib-map [options]="mapOptions" #mapComponent></lib-map>
<lib-places-search [map]="mapComponent?.map ?? null"></lib-places-search>
```

### Utiliser Mapbox au lieu de Leaflet

```typescript
import { MapProviderType, MapProviderOptions } from 'map-lib';

export class AppComponent {
  mapOptions: MapLibOptions = {
    center: [48.8566, 2.3522],
    zoom: 13
  };

  mapProviderOptions: MapProviderOptions = {
    type: MapProviderType.MAPBOX,
    apiKey: 'VOTRE_TOKEN_MAPBOX',
    mapStyle: 'mapbox://styles/mapbox/streets-v11'
  };
}
```

```html
<lib-map
  [options]="mapOptions"
  [providerOptions]="mapProviderOptions">
</lib-map>
```

### Ajouter des marqueurs personnalisés

```typescript
import { Component, OnInit } from '@angular/core';
import { MapService, IconService } from 'map-lib';

export class AppComponent implements OnInit {
  constructor(
    private mapService: MapService,
    private iconService: IconService
  ) {}

  ngOnInit() {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.addMarker();
      }
    });
  }

  addMarker() {
    const marker = this.iconService.createMarkerWithIcon(
      [48.8566, 2.3522],
      {
        iconClass: 'fas fa-map-marker-alt',
        markerColor: '#e74c3c',
        iconColor: 'white'
      },
      {
        title: 'Paris',
        description: 'La ville lumière'
      }
    );

    this.mapService.addMarker(marker);
  }
}
```

## 🔑 Configuration des clés API (optionnel)

### Google Places API

```typescript
import { GOOGLE_PLACES_API_KEY } from 'map-lib';

@NgModule({
  providers: [
    {
      provide: GOOGLE_PLACES_API_KEY,
      useValue: 'VOTRE_CLE_GOOGLE_PLACES'
    }
  ]
})
```

### Mapbox Token

```typescript
import { MAPBOX_ACCESS_TOKEN } from 'map-lib';

@NgModule({
  providers: [
    {
      provide: MAPBOX_ACCESS_TOKEN,
      useValue: 'VOTRE_TOKEN_MAPBOX'
    }
  ]
})
```

## 🎨 Exemple complet

Voici un exemple complet avec toutes les fonctionnalités :

```typescript
// app.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  MapComponent,
  MapService,
  IconService,
  MapLibOptions,
  MapProviderOptions,
  MapProviderType
} from 'map-lib';
import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  mapOptions: MapLibOptions = {
    center: [48.8566, 2.3522], // Paris
    zoom: 13
  };

  constructor(
    private mapService: MapService,
    private iconService: IconService
  ) {}

  ngOnInit() {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.setupMap();
      }
    });
  }

  setupMap() {
    // Ajouter un marqueur
    const marker = this.iconService.createMarkerWithIcon(
      [48.8566, 2.3522],
      {
        iconClass: 'fas fa-landmark',
        markerColor: '#3498db',
        iconColor: 'white'
      },
      {
        title: 'Paris',
        description: 'Capitale de la France',
        details: {
          'Population': '2.2M',
          'Région': 'Île-de-France'
        }
      }
    );

    // Créer une couche
    const markersLayer = L.layerGroup([marker]);

    // Ajouter la couche à la carte
    this.mapService.addLayer({
      id: 'monuments',
      name: 'Monuments',
      layer: markersLayer,
      enabled: true,
      zIndex: 1
    });
  }
}
```

```html
<!-- app.component.html -->
<div class="app-container">
  <h1>Ma Carte Interactive</h1>

  <div class="map-wrapper">
    <lib-map
      [options]="mapOptions"
      #mapComponent>
    </lib-map>

    <div class="map-controls">
      <lib-layer-control></lib-layer-control>
    </div>

    <lib-places-search
      [map]="mapComponent?.map ?? null">
    </lib-places-search>
  </div>
</div>
```

```css
/* app.component.css */
.app-container {
  padding: 20px;
}

.map-wrapper {
  position: relative;
  width: 100%;
  height: 600px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
}
```

## 📚 Prochaines étapes

Maintenant que vous avez une carte fonctionnelle, explorez :

- 📖 [Documentation complète](README.md)
- 🗺️ [Documentation de map-lib](projects/map-lib/README.md)
- 🎯 [Application de démonstration](projects/demo/)
- 🤝 [Guide de contribution](CONTRIBUTING.md)
- 🔧 [Exemples avancés](projects/map-lib/README.md#exemples-avancés)

## ❓ Besoin d'aide ?

- 📝 [Issues GitHub](https://github.com/nyawuwe/map-lib/issues)
- 💬 [Discussions](https://github.com/nyawuwe/map-lib/discussions)
- 📚 [Documentation](README.md)

## 🎯 Cas d'usage courants

### Carte simple avec marqueur

```typescript
// Cas le plus simple
mapOptions = {
  center: [46.603354, 1.888334],
  zoom: 6
};
```

### Carte avec recherche

```html
<lib-map [options]="mapOptions" #map></lib-map>
<lib-places-search [map]="map.map"></lib-places-search>
```

### Carte avec couches personnalisées

```typescript
// Ajouter des polygones, lignes, etc.
const polygon = L.polygon([...]);
this.mapService.addLayer({
  id: 'zone',
  name: 'Zone spéciale',
  layer: polygon,
  enabled: true
});
```

### Géolocalisation utilisateur

```typescript
this.mapService.getUserLocation().subscribe(
  coords => {
    this.mapService.setCenter(coords);
  }
);
```

---

<div align="center">

**Vous êtes prêt ! Bon développement avec MapxAngular ! 🚀**

[⬆ Retour en haut](#guide-de-démarrage-rapide-)

</div>
