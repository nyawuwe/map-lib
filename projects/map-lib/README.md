# MapLib 🗺️

<div align="center">

![Angular](https://img.shields.io/badge/Angular-18+-DD0031?style=flat&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=flat&logo=typescript)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9+-199900?style=flat&logo=leaflet)
![Mapbox](https://img.shields.io/badge/Mapbox-3.2+-000000?style=flat&logo=mapbox)

**Bibliothèque Angular moderne pour créer des applications cartographiques interactives**

</div>

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [API](#-api)
- [Exemples avancés](#-exemples-avancés)
- [Support des fournisseurs](#-support-des-fournisseurs)
- [Notes de compatibilité](#-notes-de-compatibilité)

## 📖 À propos

**MapLib** est une bibliothèque Angular puissante et flexible qui permet d'intégrer facilement des cartes interactives dans vos applications. Elle supporte à la fois **Leaflet** et **Mapbox GL JS**, offrant ainsi une grande flexibilité pour vos besoins cartographiques.

## ✨ Fonctionnalités

- ✅ **Multi-fournisseurs** : Support de Leaflet et Mapbox GL JS
- ✅ **Système de couches** : Gestion avancée des couches avec contrôle d'affichage
- ✅ **Recherche de lieux** : Recherche d'adresses et de points d'intérêt intégrée
- ✅ **Plus Codes (OLC)** : Support complet des codes Open Location Code
- ✅ **Marqueurs personnalisés** : Création facile de marqueurs avec icônes Font Awesome
- ✅ **Popups riches** : Popups personnalisables avec boutons d'action
- ✅ **Notifications Toast** : Système de notifications élégant et non-intrusif
- ✅ **Géolocalisation** : Support de la géolocalisation utilisateur
- ✅ **Contrôles de carte** : Zoom, rotation, et autres contrôles personnalisables
- ✅ **Totalement réactif** : Interface adaptée à tous les écrans
- ✅ **TypeScript** : Typage fort pour une meilleure expérience développeur

## 📦 Installation

### 1. Installer la bibliothèque

```bash
npm install map-lib
```

### 2. Installer les dépendances peer

```bash
npm install @angular/animations @angular/common @angular/core @phosphor-icons/web leaflet mapbox-gl
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

## 🔧 Support des fournisseurs

### Leaflet (par défaut)

Leaflet est le fournisseur de cartes par défaut. Il est léger, performant et ne nécessite pas de clé API pour les tuiles de base.

**Avantages :**
- ✅ Pas de clé API requise pour OpenStreetMap
- ✅ Léger et rapide
- ✅ Large écosystème de plugins
- ✅ Support excellent de tous les navigateurs

### Mapbox GL JS

Mapbox offre des cartes vectorielles modernes avec des styles personnalisables.

**Avantages :**
- ✅ Cartes vectorielles haute performance
- ✅ Styles personnalisables
- ✅ Rendu 3D et effets visuels avancés
- ✅ Mises à jour en temps réel

**Note :** Une clé API Mapbox est requise. Obtenez-la gratuitement sur [mapbox.com](https://www.mapbox.com/).

## 🔐 Configuration des clés API

### Google Places API (optionnel)

Pour utiliser la recherche de lieux avec Google Places :

```typescript
import { GOOGLE_PLACES_API_KEY } from 'map-lib';

@NgModule({
  providers: [
    { provide: GOOGLE_PLACES_API_KEY, useValue: 'VOTRE_CLE_API_GOOGLE' }
  ]
})
```

### Mapbox Access Token (optionnel)

Pour utiliser Mapbox comme fournisseur de cartes :

```typescript
import { MAPBOX_ACCESS_TOKEN } from 'map-lib';

@NgModule({
  providers: [
    { provide: MAPBOX_ACCESS_TOKEN, useValue: 'VOTRE_TOKEN_MAPBOX' }
  ]
})
```

### Plus Code API (optionnel)

Pour utiliser un serveur custom pour les Plus Codes :

```typescript
import { PLUS_CODE_API_URL } from 'map-lib';

@NgModule({
  providers: [
    { provide: PLUS_CODE_API_URL, useValue: 'https://your-api.com/pluscode' }
  ]
})
```

## 🧪 Tests

```bash
# Exécuter les tests unitaires
ng test map-lib

# Exécuter les tests avec couverture
ng test map-lib --code-coverage
```

## 📦 Build

```bash
# Build de production
ng build map-lib

# Build en mode watch (développement)
ng build map-lib --watch
```

## 🐛 Débogage

Pour activer les logs de débogage :

```typescript
import { MapConfigService } from 'map-lib';

// Dans votre composant
constructor(private mapConfig: MapConfigService) {
  this.mapConfig.enableDebugMode(true);
}
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

## 📝 Notes de compatibilité

- **Angular** : 18.0+
- **TypeScript** : 5.5+
- **Leaflet** : 1.9+
- **Mapbox GL JS** : 3.2+
- **Font Awesome** : 6.0+ (pour les icônes personnalisées)
- **Node.js** : 18.0+

## 🆘 Support

Pour obtenir de l'aide :

1. Consultez la documentation complète dans le README principal
2. Recherchez dans les [issues existantes](https://github.com/votre-username/placidusax/issues)
3. Ouvrez une [nouvelle issue](https://github.com/votre-username/placidusax/issues/new) si nécessaire

---

<div align="center">

**MapLib** - Développé avec ❤️ pour la communauté Angular

[⬆ Retour en haut](#maplib-)

</div>
