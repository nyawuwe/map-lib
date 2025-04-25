import { Component, OnInit } from '@angular/core';
import { MapService, MapLibOptions } from 'map-lib';
import * as L from 'leaflet';

@Component({
    selector: 'app-map-demo',
    template: `
    <div class="demo-container">
      <h2>Carte avec couches personnalisées</h2>
      <div class="map-container">
        <lib-map [options]="mapOptions"></lib-map>
        <div class="controls">
          <lib-layer-control></lib-layer-control>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .demo-container {
      height: 500px;
      display: flex;
      flex-direction: column;
    }
    .map-container {
      flex: 1;
      position: relative;
    }
    .controls {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
    }
  `]
})
export class MapDemoComponent implements OnInit {
    mapOptions: MapLibOptions = {
        center: [46.603354, 1.888334], // Centre de la France
        zoom: 6
    };

    constructor(private mapService: MapService) { }

    ngOnInit(): void {
        this.mapService.mapReady$.subscribe(ready => {
            if (ready) {
                this.addCustomLayers();
            }
        });
    }

    addCustomLayers(): void {
        // Ajouter une couche de marqueurs
        const markersLayer = L.layerGroup([
            L.marker([48.864716, 2.349014]).bindPopup('Paris'),
            L.marker([43.296482, 5.369780]).bindPopup('Marseille'),
            L.marker([45.764043, 4.835659]).bindPopup('Lyon')
        ]);

        this.mapService.addLayer({
            id: 'cities',
            name: 'Grandes villes',
            layer: markersLayer,
            enabled: true,
            zIndex: 1
        });

        // Ajouter un polygone
        const polygon = L.polygon([
            [48.8, 2.0],
            [48.9, 2.5],
            [48.5, 2.6],
            [48.4, 2.2]
        ], { color: 'red', fillOpacity: 0.3 });

        this.mapService.addLayer({
            id: 'region',
            name: 'Région d\'exemple',
            layer: polygon,
            enabled: false,
            zIndex: 2
        });
    }
}
