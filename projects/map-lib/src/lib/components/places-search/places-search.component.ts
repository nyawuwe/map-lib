import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlacesService, Place, MAPBOX_ACCESS_TOKEN } from '../../services/places.service';
import { MapService } from '../../services/map.service';
import * as L from 'leaflet';
import { MapProviderType } from '../../models/map-provider.model';
import mapboxgl from 'mapbox-gl';
import { Subscription } from 'rxjs';
import { Inject, Optional } from '@angular/core';
import { MapConfigService } from '../../services/map-config.service';

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

        <div *ngIf="debugInfo" class="debug-info">
          <p><strong>Mode de carte:</strong> {{ providerType }}</p>
          <p><strong>Token Mapbox:</strong> {{ mapboxTokenAvailable ? "Disponible" : "Non disponible" }}</p>
          <button (click)="toggleDebug()">Masquer</button>
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
              <div class="place-plus-code" *ngIf="place.plusCode">
                <i class="fas fa-map-marker-alt"></i> {{ place.plusCode }}
              </div>
            </div>
          </div>
        </div>

        <div class="no-results" *ngIf="searched && places.length === 0">
          Aucun point d'intérêt trouvé.
        </div>

        <div class="search-error" *ngIf="errorMessage">
          <p><i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}</p>
          <button (click)="toggleDebug()">Infos de débogage</button>
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

    .place-plus-code {
      font-size: 12px;
      color: #666;
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

    .debug-info {
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 15px;
      font-size: 12px;
    }

    .search-error {
      background-color: #ffeaea;
      border: 1px solid #ffcaca;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 15px;
      color: #d33;
      font-size: 13px;
      text-align: center;
    }

    .search-error button,
    .debug-info button {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 3px 8px;
      margin-top: 5px;
      font-size: 11px;
      cursor: pointer;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PlacesSearchComponent implements OnInit, OnDestroy {
  @Input() map: L.Map | mapboxgl.Map | null = null;
  @Output() placeSelected = new EventEmitter<Place>();

  searchQuery = '';
  searchRadius = 1000;
  autoSearch = false;
  places: Place[] = [];
  loading = false;
  searched = false;
  debugInfo = false;
  errorMessage = '';
  mapboxTokenAvailable = false;
  providerType: MapProviderType = MapProviderType.LEAFLET;

  private markersLayer: L.LayerGroup | null = null;
  private mapboxMarkers: mapboxgl.Marker[] = [];
  private currentPosition: L.LatLng | [number, number] | null = null;
  private searchSubscription: Subscription | null = null;

  constructor(
    private placesService: PlacesService,
    private mapService: MapService,
    private mapConfig: MapConfigService,
    @Optional() @Inject(MAPBOX_ACCESS_TOKEN) private mapboxToken: string
  ) { }

  ngOnInit(): void {
    this.providerType = this.mapService.getCurrentProviderType();

    // Vérifier si le jeton Mapbox est disponible
    this.mapboxTokenAvailable = !!(this.mapboxToken || this.mapConfig.mapboxApiKey);

    console.log('PlacesSearchComponent initialisé avec:');
    console.log('  - Fournisseur de carte:', this.providerType);
    console.log('  - Jeton Mapbox (injecté):', this.mapboxToken ? 'Disponible' : 'Non disponible');
    console.log('  - Jeton Mapbox (config):', this.mapConfig.mapboxApiKey ? 'Disponible' : 'Non disponible');

    if (this.map) {
      if (this.providerType === MapProviderType.LEAFLET) {
        const leafletMap = this.map as L.Map;
        leafletMap.on('moveend', () => {
          if (this.autoSearch) {
            this.searchPlacesAtCenter();
          }
        });
      } else if (this.providerType === MapProviderType.MAPBOX) {
        const mapboxMap = this.map as mapboxgl.Map;
        mapboxMap.on('moveend', () => {
          if (this.autoSearch) {
            this.searchPlacesAtCenter();
          }
        });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  toggleDebug(): void {
    this.debugInfo = !this.debugInfo;
  }

  searchPlaces(): void {
    if (!this.searchQuery.trim() || !this.map) {
      this.errorMessage = "Veuillez entrer un terme de recherche";
      return;
    }

    this.loading = true;
    this.searched = true;
    this.errorMessage = '';

    // Récupérer le centre de la carte selon le fournisseur
    let centerLat: number;
    let centerLng: number;

    if (this.providerType === MapProviderType.LEAFLET) {
      const center = (this.map as L.Map).getCenter();
      centerLat = center.lat;
      centerLng = center.lng;
      this.currentPosition = center;
    } else {
      const center = (this.map as mapboxgl.Map).getCenter();
      centerLat = center.lat;
      centerLng = center.lng;
      this.currentPosition = [centerLat, centerLng];
    }

    console.log(`Recherche de '${this.searchQuery}' à [${centerLat}, ${centerLng}] dans un rayon de ${this.searchRadius}m`);

    // Annuler la souscription précédente si elle existe
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    this.searchSubscription = this.placesService.getNearbyPlaces(
      centerLat,
      centerLng,
      this.searchRadius,
      this.searchQuery
    ).subscribe(
      places => {
        console.log(`Résultat de la recherche: ${places.length} lieux trouvés`, places);
        this.places = places;
        this.loading = false;
        this.addMarkersToMap(places);
      },
      error => {
        console.error('Erreur lors de la recherche des points d\'intérêt:', error);
        this.loading = false;
        this.errorMessage = `Erreur: ${error.message || 'Problème lors de la recherche'}`;

        // Si l'erreur est liée à CORS ou au réseau
        if (error.status === 0) {
          this.errorMessage = "Erreur de connexion. Vérifiez que le CORS est correctement configuré.";
        } else if (error.status === 401 || error.status === 403) {
          this.errorMessage = "Erreur d'authentification. Vérifiez vos clés d'API.";
        }
      }
    );
  }

  searchPlacesAtCenter(): void {
    if (!this.searchQuery.trim() || !this.map) return;
    this.searchPlaces();
  }

  selectPlace(place: Place): void {
    this.placeSelected.emit(place);

    // Centrer la carte sur le lieu sélectionné selon le fournisseur
    if (this.map) {
      if (this.providerType === MapProviderType.LEAFLET) {
        const leafletMap = this.map as L.Map;
        leafletMap.setView([place.lat, place.lng], 16);
      } else if (this.providerType === MapProviderType.MAPBOX) {
        const mapboxMap = this.map as mapboxgl.Map;
        mapboxMap.flyTo({
          center: [place.lng, place.lat], // Mapbox utilise [lng, lat]
          zoom: 16,
          essential: true
        });
      }
    }
  }

  onAutoSearchChange(): void {
    if (this.autoSearch) {
      this.searchPlacesAtCenter();
    }
  }

  onRadiusChange(): void {
    if (this.autoSearch) {
      this.searchPlacesAtCenter();
    }
  }

  private addMarkersToMap(places: Place[]): void {
    this.removeMarkersFromMap();

    if (!this.map) return;

    if (this.providerType === MapProviderType.LEAFLET) {
      // Utilisation de Leaflet
      this.markersLayer = L.layerGroup();

      places.forEach(place => {
        const marker = this.placesService.createPlaceMarker(place);
        marker.on('click', () => this.selectPlace(place));
        marker.addTo(this.markersLayer!);
      });

      (this.map as L.Map).addLayer(this.markersLayer);
    } else if (this.providerType === MapProviderType.MAPBOX) {
      // Utilisation de Mapbox
      const mapboxMap = this.map as mapboxgl.Map;

      places.forEach(place => {
        // Création d'un élément DOM personnalisé pour le marqueur
        const el = document.createElement('div');
        el.className = 'mapbox-custom-marker';
        el.innerHTML = `<i class="fas ${this.getIconClass(place.type)}"></i>`;

        // Style pour le marqueur
        el.style.color = this.getMarkerColor(place.type);
        el.style.fontSize = '20px';
        el.style.cursor = 'pointer';

        // Créer et ajouter le marqueur à la carte
        const marker = new mapboxgl.Marker(el)
          .setLngLat([place.lng, place.lat])
          .addTo(mapboxMap);

        // Ajouter un popup avec les informations
        if (place.name || place.address) {
          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div>
                <h4>${place.name}</h4>
                ${place.address ? `<p>${place.address}</p>` : ''}
                ${place.rating ? `<p><i class="fas fa-star"></i> ${place.rating}</p>` : ''}
              </div>
            `);

          marker.setPopup(popup);
        }

        // Ajouter un écouteur d'événement pour la sélection
        el.addEventListener('click', () => this.selectPlace(place));

        // Stocker le marqueur pour pouvoir le supprimer plus tard
        this.mapboxMarkers.push(marker);
      });
    }
  }

  private removeMarkersFromMap(): void {
    if (this.providerType === MapProviderType.LEAFLET) {
      if (this.markersLayer && this.map) {
        (this.map as L.Map).removeLayer(this.markersLayer);
        this.markersLayer = null;
      }
    } else if (this.providerType === MapProviderType.MAPBOX) {
      // Supprimer les marqueurs Mapbox
      this.mapboxMarkers.forEach(marker => marker.remove());
      this.mapboxMarkers = [];
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

  private getMarkerColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      restaurant: '#e74c3c',
      cafe: '#8b4513',
      bar: '#2c3e50',
      store: '#3498db',
      shopping_mall: '#9b59b6',
      hotel: '#f39c12',
      museum: '#1abc9c',
      park: '#27ae60',
      school: '#3498db',
      hospital: '#e74c3c',
      transit_station: '#34495e',
      airport: '#7f8c8d',
      default: '#95a5a6'
    };

    return colorMap[type] || colorMap['default'];
  }
}
