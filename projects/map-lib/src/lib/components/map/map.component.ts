import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MapService } from '../../services/map.service';
import { MapLibOptions } from '../../models/map-options.model';
import * as L from 'leaflet';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { CommonModule } from '@angular/common';
import { PlusCodeCardComponent } from '../plus-code-card/plus-code-card.component';

@Component({
  selector: 'lib-map',
  template: `
    <div class="map-container">
      <div #mapContainer class="map-element"></div>
      <lib-map-controls *ngIf="map"
        [map]="map"
        (locationFound)="onLocationFound($event)"
        (locationError)="onLocationError($event)">
      </lib-map-controls>
      <lib-plus-code-card *ngIf="map"></lib-plus-code-card>
    </div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 100%;
      display: block;
      box-sizing: border-box;
      position: relative;
    }
    .map-element {
      width: 100%;
      height: 100%;
    }
  `],
  standalone: true,
  imports: [CommonModule, MapControlsComponent, PlusCodeCardComponent]
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @ViewChild(PlusCodeCardComponent) plusCodeCard!: PlusCodeCardComponent;

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

  onLocationFound(e: L.LocationEvent): void {
    if (this.plusCodeCard) {
      this.plusCodeCard.show(e.latlng.lat, e.latlng.lng);
    }
  }

  onLocationError(e: L.ErrorEvent): void {
    if (this.plusCodeCard) {
      this.plusCodeCard.hide();
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
