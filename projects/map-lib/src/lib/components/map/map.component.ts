import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MapService } from '../../services/map.service';
import { MapLibOptions } from '../../models/map-options.model';
import * as L from 'leaflet';

@Component({
    selector: 'lib-map',
    template: `
    <div class="map-container">
      <div #mapContainer class="map-element"></div>
    </div>
  `,
    styles: [`
    .map-container {
      width: 100%;
      height: 100%;
      display: block;
      box-sizing: border-box;
    }
    .map-element {
      width: 100%;
      height: 100%;
    }
  `],
    standalone: true
})
export class MapComponent implements OnInit, OnDestroy {
    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

    @Input() options: MapLibOptions = {};

    map: L.Map | null = null;

    constructor(private mapService: MapService) { }

    ngOnInit(): void {
        this.initMap();
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    private initMap(): void {
        if (!this.mapContainer) {
            console.error('Élément de carte non trouvé');
            return;
        }

        this.map = this.mapService.initMap(this.mapContainer.nativeElement, this.options);
    }
}
