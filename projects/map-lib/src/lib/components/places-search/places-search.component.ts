import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlacesService, Place } from '../../services/places.service';
import { MapService } from '../../services/map.service';
import * as L from 'leaflet';

@Component({
  selector: 'lib-places-search',
  template: `
    <div class="places-search-container">
      <div class="places-search-card">
        <h3>Points d'intérêt</h3>

        <div class="search-controls">
          <div class="search-input">
            <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher un type de lieu..."
                   (keyup.enter)="searchPlaces()">
            <button (click)="searchPlaces()">
              <i class="fas fa-search"></i>
            </button>
          </div>

          <div class="search-options">
            <label>
              <input type="checkbox" [(ngModel)]="autoSearch" (change)="onAutoSearchChange()">
              Recherche automatique
            </label>
            <div class="radius-control" *ngIf="autoSearch">
              <label>Rayon (m):</label>
              <input type="range" min="100" max="5000" step="100" [(ngModel)]="searchRadius"
                     (change)="onRadiusChange()">
              <span>{{ searchRadius }}m</span>
            </div>
          </div>
        </div>

        <div class="places-list" *ngIf="places.length > 0">
          <div class="place-item" *ngFor="let place of places" (click)="selectPlace(place)">
            <i class="fas" [ngClass]="getIconClass(place.type)"></i>
            <div class="place-info">
              <div class="place-name">{{ place.name }}</div>
              <div class="place-address" *ngIf="place.address">{{ place.address }}</div>
              <div class="place-rating" *ngIf="place.rating">
                <i class="fas fa-star"></i> {{ place.rating }}
              </div>
            </div>
          </div>
        </div>

        <div class="no-results" *ngIf="searched && places.length === 0">
          Aucun point d'intérêt trouvé.
        </div>

        <div class="loading" *ngIf="loading">
          <i class="fas fa-spinner fa-spin"></i> Recherche en cours...
        </div>
      </div>
    </div>
  `,
  styles: [`
    .places-search-container {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 1000;
      max-width: 300px;
      width: 100%;
    }

    .places-search-card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 15px;
      max-height: 80vh;
      overflow-y: auto;
    }

    h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .search-controls {
      margin-bottom: 15px;
    }

    .search-input {
      display: flex;
      margin-bottom: 10px;
    }

    .search-input input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px 0 0 4px;
      font-size: 14px;
    }

    .search-input button {
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 0 4px 4px 0;
      padding: 0 12px;
      cursor: pointer;
    }

    .search-options {
      font-size: 13px;
    }

    .radius-control {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .radius-control input[type="range"] {
      flex: 1;
    }

    .places-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .place-item {
      display: flex;
      padding: 10px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .place-item:hover {
      background-color: #f5f5f5;
    }

    .place-item i {
      font-size: 18px;
      margin-right: 10px;
      color: #666;
      width: 20px;
      text-align: center;
    }

    .place-info {
      flex: 1;
    }

    .place-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .place-address {
      font-size: 12px;
      color: #666;
    }

    .place-rating {
      font-size: 12px;
      color: #f39c12;
      margin-top: 2px;
    }

    .no-results, .loading {
      text-align: center;
      padding: 15px;
      color: #666;
      font-size: 14px;
    }

    .loading i {
      margin-right: 8px;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PlacesSearchComponent implements OnInit {
  @Input() map: L.Map | null = null;
  @Output() placeSelected = new EventEmitter<Place>();

  searchQuery = '';
  searchRadius = 1000;
  autoSearch = false;
  places: Place[] = [];
  loading = false;
  searched = false;
  private markersLayer: L.LayerGroup | null = null;
  private currentPosition: L.LatLng | null = null;

  constructor(
    private placesService: PlacesService,
    private mapService: MapService
  ) { }

  ngOnInit(): void {
    if (this.map) {
      this.map.on('moveend', () => {
        if (this.autoSearch) {
          this.searchPlacesAtCenter();
        }
      });
    }
  }

  searchPlaces(): void {
    if (!this.searchQuery.trim() || !this.map) return;

    this.loading = true;
    this.searched = true;

    const center = this.map.getCenter();
    this.currentPosition = center;

    this.placesService.getNearbyPlaces(
      center.lat,
      center.lng,
      this.searchRadius,
      this.searchQuery
    ).subscribe(
      places => {
        this.places = places;
        this.loading = false;
        this.addMarkersToMap(places);
      },
      error => {
        console.error('Erreur lors de la recherche des points d\'intérêt:', error);
        this.loading = false;
      }
    );
  }

  searchPlacesAtCenter(): void {
    if (!this.autoSearch || !this.map) return;

    const center = this.map.getCenter();

    if (this.currentPosition &&
      center.distanceTo(this.currentPosition) < this.searchRadius / 4) {
      return;
    }

    this.currentPosition = center;
    this.loading = true;

    this.placesService.getNearbyPlaces(
      center.lat,
      center.lng,
      this.searchRadius
    ).subscribe(
      places => {
        this.places = places;
        this.loading = false;
        this.addMarkersToMap(places);
      },
      error => {
        console.error('Erreur lors de la recherche des points d\'intérêt:', error);
        this.loading = false;
      }
    );
  }

  selectPlace(place: Place): void {
    if (!this.map) return;

    this.placeSelected.emit(place);
    this.map.setView([place.lat, place.lng], 16);

    this.markersLayer?.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        const markerLatLng = layer.getLatLng();
        if (markerLatLng.lat === place.lat && markerLatLng.lng === place.lng) {
          layer.openPopup();
        }
      }
    });
  }

  onAutoSearchChange(): void {
    if (this.autoSearch) {
      this.searchPlacesAtCenter();
    } else {
      this.removeMarkersFromMap();
    }
  }

  onRadiusChange(): void {
    if (this.autoSearch) {
      this.searchPlacesAtCenter();
    }
  }

  private addMarkersToMap(places: Place[]): void {
    if (!this.map) return;

    this.removeMarkersFromMap();
    this.markersLayer = L.layerGroup().addTo(this.map);

    places.forEach(place => {
      const marker = this.placesService.createPlaceMarker(place);
      this.markersLayer?.addLayer(marker);
    });

    this.mapService.addLayer({
      id: 'places',
      name: 'Points d\'intérêt',
      layer: this.markersLayer,
      enabled: true,
      zIndex: 10
    });
  }

  private removeMarkersFromMap(): void {
    if (this.markersLayer && this.map) {
      this.map.removeLayer(this.markersLayer);
      this.markersLayer = null;
    }
  }

  getIconClass(type: string): string {
    const iconMap: { [key: string]: string } = {
      restaurant: 'fa-utensils',
      cafe: 'fa-coffee',
      bar: 'fa-glass-martini-alt',
      store: 'fa-shopping-bag',
      shopping_mall: 'fa-shopping-cart',
      hotel: 'fa-hotel',
      museum: 'fa-landmark',
      park: 'fa-tree',
      school: 'fa-school',
      hospital: 'fa-hospital',
      transit_station: 'fa-train',
      airport: 'fa-plane',
      default: 'fa-map-marker-alt'
    };

    return iconMap[type] || iconMap['default'];
  }
}
