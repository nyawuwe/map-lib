import { Component } from '@angular/core';
import { MapLibOptions } from 'map-lib';

@Component({
    selector: 'app-root',
    template: `
    <div class="app-container">
      <h1>Démo de Map-Lib</h1>

      <div class="map-section">
        <h2>Carte de base</h2>
        <div class="map-wrapper">
          <lib-map [options]="mapOptions"></lib-map>
          <div class="controls-panel">
            <lib-layer-control></lib-layer-control>
          </div>
        </div>
      </div>

      <div class="map-section">
        <app-map-demo></app-map-demo>
      </div>
    </div>
  `,
    styles: [`
    .app-container {
      padding: 16px;
      box-sizing: border-box;
    }
    h1, h2 {
      margin-top: 0;
    }
    .map-section {
      margin-bottom: 32px;
    }
    .map-wrapper {
      height: 500px;
      position: relative;
      border: 1px solid #ccc;
      border-radius: 4px;
      overflow: hidden;
    }
    .controls-panel {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
    }
  `]
})
export class AppComponent {
    mapOptions: MapLibOptions = {
        center: [48.864716, 2.349014], // Paris
        zoom: 8,
        maxZoom: 18,
        minZoom: 3
    };
}
