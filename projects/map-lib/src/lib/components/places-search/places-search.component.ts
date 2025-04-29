import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlacesService, Place, MAPBOX_ACCESS_TOKEN, PlaceSuggestion } from '../../services/places.service';
import { MapService } from '../../services/map.service';
import * as L from 'leaflet';
import { MapProviderType } from '../../models/map-provider.model';
import mapboxgl from 'mapbox-gl';
import { Subscription, Subject, debounceTime, distinctUntilChanged, switchMap, tap, of } from 'rxjs';
import { Inject, Optional } from '@angular/core';
import { MapConfigService } from '../../services/map-config.service';

// Interface pour la zone marquée
export interface MarkedZone {
  lat: number;
  lng: number;
  name: string;
  plusCode: string;
}

// Interface pour les données de localisation
export interface PlacesLocationData {
  latlng: L.LatLng | [number, number];
  accuracy: number;
}

@Component({
  selector: 'lib-places-search',
  template: `
    <div class="places-search-container">
      <div class="places-search-card" [class.expanded]="showFullPanel">
        <div class="card-header" (click)="togglePanel()">
          <h3>
            <i class="fas fa-map-marker-alt"></i>
            Points d'intérêt
          </h3>
          <button class="toggle-button">
            <i class="fas" [ngClass]="showFullPanel ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>
        </div>

        <div class="card-content" *ngIf="showFullPanel">
          <div class="search-controls">
            <div class="search-wrapper">
              <div class="search-input">
                <i class="fas fa-search search-icon"></i>
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  placeholder="Rechercher un lieu..."
                  (keyup)="onSearchKeyUp($event)"
                  (focus)="showSuggestions = true"
                >
                <button class="clear-button" *ngIf="searchQuery" (click)="clearSearch()">
                  <i class="fas fa-times"></i>
                </button>
                <button class="location-button" [class.active]="isLocating" (click)="locateUser($event)"
                  title="Ma position">
                  <i class="fas fa-crosshairs"></i>
                </button>
              </div>

              <ng-container *ngIf="showSuggestions && suggestions.length > 0">
                <div class="suggestion-item"
                    *ngFor="let suggestion of suggestions"
                    (click)="selectSuggestion(suggestion)"
                    [class.active]="suggestion === activeSuggestion">
                  <i class="fas fa-map-marker-alt suggestion-icon"></i>
                  <div class="suggestion-content">
                    <div class="suggestion-name">{{ suggestion.name }}</div>
                    <div class="suggestion-description" *ngIf="suggestion.description">{{ suggestion.description }}</div>
                  </div>
                </div>
              </ng-container>
            </div>

            <div class="filter-controls">
              <div class="search-option">
                <label class="checkbox-container">
                  <input type="checkbox" [(ngModel)]="autoSearch" (change)="onAutoSearchChange()">
                  <span class="checkmark"></span>
                  <span class="label-text">Recherche automatique</span>
                </label>
              </div>

              <div class="radius-control" *ngIf="autoSearch">
                <label class="radius-label">Rayon: {{ searchRadius }}m</label>
                <div class="slider-container">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    [(ngModel)]="searchRadius"
                    (change)="onRadiusChange()"
                    class="slider"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Indicateur de chargement -->
          <div class="loading-indicator" *ngIf="loading">
            <div class="spinner">
              <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            <p>Recherche en cours...</p>
          </div>

          <!-- Message pour aucun résultat -->
          <div class="no-results-message" *ngIf="searched && places.length === 0 && !loading">
            <div class="message-content">
              <i class="fas fa-search"></i>
              <p>Aucun point d'intérêt trouvé</p>
            </div>
          </div>

          <!-- Message d'erreur -->
          <div class="error-message" *ngIf="errorMessage && !loading">
            <div class="message-content">
              <i class="fas fa-exclamation-triangle"></i>
              <p>{{ errorMessage }}</p>
              <button class="debug-button" (click)="toggleDebug()">Infos de débogage</button>
            </div>
          </div>

          <!-- Position actuelle (géolocalisation) -->
          <div class="user-location" *ngIf="userLocation">
            <div class="user-location-header">
              <h4>
                <i class="fas fa-crosshairs"></i>
                Ma position
              </h4>
              <button class="close-button" (click)="clearUserLocation()">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="user-location-content">
              <div class="user-location-details">
                <div class="user-location-coords">
                  <i class="fas fa-map-marker-alt"></i>
                  {{ userLocation.lat.toFixed(6) }}, {{ userLocation.lng.toFixed(6) }}
                </div>
                <div class="user-location-plus-code">
                  <i class="fas fa-location-arrow"></i>
                  {{ userLocation.plusCode }}
                </div>
                <div class="user-location-accuracy" *ngIf="userLocation.accuracy">
                  <i class="fas fa-circle"></i>
                  Précision: {{ userLocation.accuracy.toFixed(0) }} m
                </div>
              </div>
            </div>
          </div>

          <!-- Informations de débogage -->
          <div *ngIf="debugInfo" class="debug-info">
            <div class="debug-header">
              <h4>Informations de débogage</h4>
              <button class="close-button" (click)="toggleDebug()">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <p><strong>Mode de carte:</strong> {{ providerType }}</p>
            <p><strong>Token Mapbox:</strong> {{ mapboxTokenAvailable ? "Disponible" : "Non disponible" }}</p>
          </div>

          <!-- Liste des lieux trouvés -->
          <div class="places-results" *ngIf="places.length > 0 && !loading">
            <div class="place-item"
                  *ngFor="let place of places"
                  (click)="selectPlace(place)"
                  [class.selected]="selectedPlace === place">
              <div class="place-icon">
                <i class="fas" [ngClass]="getIconClass(place.type)"></i>
              </div>
              <div class="place-info">
                <div class="place-name">{{ place.name }}</div>
                <div class="place-details">
                  <div class="place-address" *ngIf="place.address">
                    <i class="fas fa-map-signs"></i> {{ place.address }}
                  </div>
                  <div class="place-rating" *ngIf="place.rating">
                    <i class="fas fa-star"></i> {{ place.rating }}
                  </div>
                  <div class="place-plus-code" *ngIf="place.plusCode">
                    <i class="fas fa-location-arrow"></i> {{ place.plusCode }}
                  </div>
                </div>
              </div>
              <button
                class="mark-zone-button"
                *ngIf="selectedPlace === place && selectedPlace.lat !== 0 && selectedPlace.lng !== 0"
                (click)="markZone(place, $event)">
                <i class="fas fa-map-marker-alt"></i>
              </button>
            </div>
          </div>

          <!-- Zone marquée -->
          <div class="marked-zone" *ngIf="markedZone">
            <div class="marked-zone-header">
              <h4>Zone marquée</h4>
              <button class="close-button" (click)="clearMarkedZone()">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="marked-zone-content">
              <div class="marked-zone-name">
                <i class="fas fa-map-marker-alt"></i> {{ markedZone.name }}
              </div>
              <div class="marked-zone-coords">
                <i class="fas fa-crosshairs"></i> {{ markedZone.lat.toFixed(6) }}, {{ markedZone.lng.toFixed(6) }}
              </div>
              <div class="marked-zone-plus-code">
                <i class="fas fa-location-arrow"></i> {{ markedZone.plusCode }}
              </div>
            </div>
          </div>
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
      width: 350px;
      max-width: calc(100% - 40px);
      transition: all 0.3s ease;
    }

    .places-search-card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .places-search-card.expanded {
      max-height: 80vh;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background-color: white;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
    }

    .card-header h3 {
      margin: 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
    }

    .card-header h3 i {
      margin-right: 8px;
      color: #2196F3;
    }

    .toggle-button {
      background: none;
      border: none;
      color: #777;
      cursor: pointer;
      padding: 5px;
      transition: color 0.2s;
    }

    .toggle-button:hover {
      color: #333;
    }

    .card-content {
      padding: 15px;
      overflow: visible;
      max-height: calc(80vh - 60px);
    }

    .search-controls {
      margin-bottom: 15px;
    }

    .search-wrapper {
      position: relative;
      margin-bottom: 15px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .search-input {
      display: flex;
      align-items: center;
      position: relative;
      background-color: #f5f5f5;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .search-input:focus-within {
      background-color: white;
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    .search-icon {
      color: #777;
      margin-left: 12px;
    }

    .search-input input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 12px 10px 12px 10px;
      font-size: 14px;
      outline: none;
    }

    .search-input input::placeholder {
      color: #999;
    }

    .clear-button {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0 12px;
      height: 100%;
      transition: color 0.2s;
    }

    .clear-button:hover {
      color: #f44336;
    }

    .suggestion-item {
      display: flex;
      align-items: flex-start;
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s;
    }

    .suggestion-item:last-child {
      border-bottom: none;
      border-radius: 0 0 8px 8px;
    }

    .suggestion-item:hover,
    .suggestion-item.active {
      background-color: #f0f7ff;
    }

    .suggestion-icon {
      color: #2196F3;
      margin-right: 10px;
      margin-top: 3px;
    }

    .suggestion-content {
      flex: 1;
    }

    .suggestion-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .suggestion-description {
      font-size: 12px;
      color: #666;
    }

    .filter-controls {
      margin-top: 15px;
    }

    .search-option {
      margin-bottom: 10px;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 30px;
      cursor: pointer;
      font-size: 14px;
      user-select: none;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 20px;
      width: 20px;
      background-color: #f0f0f0;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .checkbox-container:hover input ~ .checkmark {
      background-color: #e0e0e0;
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: #2196F3;
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }

    .checkbox-container .checkmark:after {
      left: 7px;
      top: 3px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .label-text {
      color: #555;
    }

    .radius-control {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 12px;
      margin-top: 10px;
    }

    .radius-label {
      display: block;
      margin-bottom: 10px;
      font-size: 14px;
      color: #555;
    }

    .slider-container {
      padding: 0 5px;
    }

    .slider {
      -webkit-appearance: none;
      width: 100%;
      height: 5px;
      border-radius: 5px;
      background: #ddd;
      outline: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2196F3;
      cursor: pointer;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
      transition: all 0.2s;
    }

    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }

    .slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2196F3;
      cursor: pointer;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
      transition: all 0.2s;
      border: none;
    }

    .slider::-moz-range-thumb:hover {
      transform: scale(1.1);
    }

    .mark-zone-button {
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }

    .mark-zone-button:hover {
      background-color: #43A047;
      transform: scale(1.1);
    }

    .marked-zone {
      margin-top: 15px;
      background-color: #e8f5e9;
      border-radius: 8px;
      padding: 15px;
      border: 1px solid #c8e6c9;
    }

    .marked-zone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .marked-zone-header h4 {
      margin: 0;
      color: #2E7D32;
      font-size: 16px;
      font-weight: 500;
    }

    .marked-zone-content > div {
      margin-bottom: 5px;
      display: flex;
      align-items: center;
    }

    .marked-zone-content i {
      color: #2E7D32;
      margin-right: 8px;
      width: 16px;
      text-align: center;
    }

    .marked-zone-name {
      font-weight: 500;
      font-size: 14px;
    }

    .marked-zone-coords,
    .marked-zone-plus-code {
      font-size: 13px;
      color: #555;
    }

    /* Styles pour l'indicateur de chargement */
    .loading-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px 0;
      color: #555;
    }

    .spinner {
      font-size: 24px;
      color: #2196F3;
      margin-bottom: 10px;
    }

    .loading-indicator p {
      margin: 0;
      font-size: 14px;
    }

    /* Style pour les messages (pas de résultats, erreur) */
    .no-results-message,
    .error-message {
      padding: 20px 0;
    }

    .message-content {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .message-content i {
      font-size: 24px;
      margin-bottom: 10px;
      color: #999;
    }

    .error-message .message-content i {
      color: #f44336;
    }

    .message-content p {
      margin: 0 0 10px 0;
      color: #555;
    }

    .debug-button {
      background-color: #f0f0f0;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 5px;
    }

    .debug-button:hover {
      background-color: #e0e0e0;
    }

    .debug-info {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 12px;
      margin-top: 15px;
      margin-bottom: 15px;
      font-size: 12px;
      border: 1px solid #e0e0e0;
    }

    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .debug-header h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
    }

    .close-button:hover {
      color: #333;
    }

    /* Style pour la liste des résultats */
    .places-results {
      margin-top: 15px;
      border-radius: 8px;
      background-color: white;
      overflow: visible;
    }

    .place-item {
      display: flex;
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: all 0.2s;
    }

    .place-item:last-child {
      border-bottom: none;
    }

    .place-item:hover {
      background-color: #f0f7ff;
    }

    .place-item.selected {
      background-color: #e3f2fd;
      border-left: 3px solid #2196F3;
    }

    .place-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #f0f7ff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .place-icon i {
      font-size: 18px;
      color: #2196F3;
    }

    .place-info {
      flex: 1;
      min-width: 0;
    }

    .place-name {
      font-weight: 500;
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #333;
    }

    .place-details {
      font-size: 12px;
      color: #666;
    }

    .place-address, .place-rating, .place-plus-code {
      margin-bottom: 2px;
      display: flex;
      align-items: center;
    }

    .place-address i, .place-rating i, .place-plus-code i {
      margin-right: 5px;
      width: 14px;
      text-align: center;
    }

    .place-rating i {
      color: #FFC107;
    }

    .location-button {
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }

    .location-button:hover {
      background-color: #1976D2;
      transform: scale(1.1);
    }

    .location-button.active {
      background-color: #FF5722;
    }

    .user-location {
      margin-top: 15px;
      background-color: #e3f2fd;
      border-radius: 8px;
      padding: 15px;
      border: 1px solid #bbdefb;
    }

    .user-location-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .user-location-header h4 {
      margin: 0;
      color: #1565C0;
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
    }

    .user-location-header h4 i {
      margin-right: 8px;
    }

    .user-location-content > div {
      margin-bottom: 5px;
    }

    .user-location-details > div {
      margin-bottom: 5px;
      display: flex;
      align-items: center;
    }

    .user-location-details i {
      color: #1565C0;
      margin-right: 8px;
      width: 16px;
      text-align: center;
    }

    .user-location-coords,
    .user-location-plus-code,
    .user-location-accuracy {
      font-size: 13px;
      color: #555;
    }

    @media (max-width: 576px) {
      .places-search-container {
        width: calc(100% - 40px);
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PlacesSearchComponent implements OnInit, OnDestroy {
  @Input() map: L.Map | mapboxgl.Map | null = null;
  @Input() plusCodeCard: any = null;
  @Output() placeSelected = new EventEmitter<Place>();
  @Output() zoneMarked = new EventEmitter<MarkedZone>();
  @Output() locationFound = new EventEmitter<PlacesLocationData>();
  @Output() locationError = new EventEmitter<any>();

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
  showFullPanel = true;
  selectedPlace: Place | null = null;
  markedZone: MarkedZone | null = null;
  userLocation: { lat: number, lng: number, plusCode: string, accuracy?: number } | null = null;
  isLocating = false;

  // Propriétés pour la visualisation de la zone marquée
  private zoneMarker: L.Marker | mapboxgl.Marker | null = null;
  private zoneCircle: L.Circle | null = null;
  private zoneGeoJSONSource: string = 'marked-zone-geojson';

  // Propriétés pour la localisation utilisateur
  private locationMarker: L.Marker | mapboxgl.Marker | null = null;
  private locationCircle: L.Circle | null = null;
  private locationGeoJSONSource: string = 'user-location-geojson';
  private geolocateControl: mapboxgl.GeolocateControl | null = null;

  // Propriétés pour l'autocomplétion
  suggestions: PlaceSuggestion[] = [];
  showSuggestions = false;
  activeSuggestion: PlaceSuggestion | null = null;
  private searchTerms = new Subject<string>();
  private suggestionsSubscription?: Subscription;

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

    // Configuration de l'autocomplétion avec debounceTime
    this.suggestionsSubscription = this.searchTerms.pipe(
      debounceTime(300), // Attendre 300ms après que l'utilisateur ait arrêté de taper
      distinctUntilChanged(), // Ignorer si le terme est le même qu'avant
      tap(() => this.loading = true),
      switchMap(term => {
        if (term.length < 2) { // Ignorer les termes trop courts
          this.suggestions = [];
          this.loading = false;
          return of([]);
        }

        // Récupérer les coordonnées actuelles de la carte pour un meilleur contexte
        let lat: number | undefined;
        let lng: number | undefined;

        if (this.map) {
          if (this.providerType === MapProviderType.LEAFLET) {
            const center = (this.map as L.Map).getCenter();
            lat = center.lat;
            lng = center.lng;
          } else {
            const center = (this.map as mapboxgl.Map).getCenter();
            lat = center.lat;
            lng = center.lng;
          }
        }

        return this.placesService.getPlaceSuggestions(term, lat, lng);
      })
    ).subscribe(suggestions => {
      this.suggestions = suggestions;
      this.loading = false;
      this.showSuggestions = suggestions.length > 0;
    }, error => {
      console.error('Erreur lors de la récupération des suggestions:', error);
      this.loading = false;
      this.showSuggestions = false;
    });

    // Ajouter un écouteur pour gérer les clics en dehors de la zone de suggestions
    document.addEventListener('click', this.handleOutsideClick);
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.suggestionsSubscription) {
      this.suggestionsSubscription.unsubscribe();
    }
    // Supprimer l'écouteur d'événements pour éviter les fuites de mémoire
    document.removeEventListener('click', this.handleOutsideClick);
    this.cleanupLocationResources();
  }

  // Gestionnaire pour les clics en dehors de la zone de suggestions
  private handleOutsideClick = (event: MouseEvent) => {
    // Vérifier si le clic est en dehors de la zone de suggestions
    const suggestionsElement = document.querySelector('.suggestions-dropdown');
    const searchInputElement = document.querySelector('.search-input');

    if (suggestionsElement && searchInputElement) {
      if (!suggestionsElement.contains(event.target as Node) &&
        !searchInputElement.contains(event.target as Node)) {
        this.showSuggestions = false;
      }
    }
  };

  togglePanel(): void {
    this.showFullPanel = !this.showFullPanel;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.showSuggestions = false;
    this.suggestions = [];
    this.places = [];
    this.errorMessage = '';
    this.searched = false;
  }

  // Méthode appelée lorsque l'utilisateur tape dans le champ de recherche
  onSearchKeyUp(event: KeyboardEvent): void {
    // Gérer les touches spéciales
    if (event.key === 'Escape') {
      this.showSuggestions = false;
      return;
    } else if (event.key === 'ArrowDown') {
      this.navigateSuggestion(1);
      return;
    } else if (event.key === 'ArrowUp') {
      this.navigateSuggestion(-1);
      return;
    } else if (event.key === 'Enter') {
      if (this.activeSuggestion) {
        this.selectSuggestion(this.activeSuggestion);
        return;
      } else {
        this.showSuggestions = false;
        this.searchPlaces();
        return;
      }
    }

    // Si nous sommes ici, c'est une saisie normale
    // Émettre le terme de recherche pour l'autocomplétion
    const term = this.searchQuery.trim();
    this.searchTerms.next(term);
  }

  // Navigation dans les suggestions avec les flèches
  navigateSuggestion(direction: number): void {
    if (!this.suggestions.length) return;

    const currentIndex = this.activeSuggestion
      ? this.suggestions.indexOf(this.activeSuggestion)
      : -1;

    let newIndex = currentIndex + direction;

    // S'assurer que l'index reste dans les limites
    if (newIndex < 0) newIndex = this.suggestions.length - 1;
    if (newIndex >= this.suggestions.length) newIndex = 0;

    this.activeSuggestion = this.suggestions[newIndex];
  }

  // Sélectionner une suggestion
  selectSuggestion(suggestion: PlaceSuggestion): void {
    this.searchQuery = suggestion.name;
    this.showSuggestions = false;
    this.activeSuggestion = null;

    // Rechercher par ID, quelle que soit la source
    // Cela fonctionne maintenant pour Google et Mapbox car nous avons amélioré les deux implémentations
    this.searchByPlaceId(suggestion.id);
  }

  // Rechercher un lieu par son ID (pour Google Places)
  private searchByPlaceId(placeId: string): void {
    console.log('Recherche par place ID:', placeId);
    this.loading = true;
    this.searched = true;
    this.errorMessage = '';

    this.placesService.getPlaceDetails(placeId).subscribe(
      place => {
        console.log('Détails du lieu récupérés:', place);

        if (place && place.id) {
          // Vérifier si le lieu a des coordonnées valides
          if (place.lat === 0 && place.lng === 0) {
            console.warn('Lieu sans coordonnées valides. ID:', place.id);
          } else {
            console.log(`Coordonnées valides trouvées: lat=${place.lat}, lng=${place.lng}`);
          }

          this.places = [place];
          this.addMarkersToMap([place]);
          this.selectPlace(place); // Auto-sélectionner le résultat
        } else {
          console.warn('Détails du lieu incomplets ou manquants');
          // Fallback à la recherche standard si le détail n'est pas disponible
          this.searchPlaces();
        }
        this.loading = false;
      },
      error => {
        console.error('Erreur lors de la récupération des détails du lieu:', error);
        this.loading = false;
        // Fallback à la recherche standard
        this.searchPlaces();
      }
    );
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
    this.showSuggestions = false;
    this.selectedPlace = null;

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
    console.log('selectPlace appelé avec:', place);

    // Vérifier si nous avons déjà des coordonnées valides
    if (place.lat === 0 && place.lng === 0) {
      console.warn('Lieu sans coordonnées valides, tentative de récupération des détails...');
      this.loading = true;

      // Essayer de récupérer les coordonnées par l'API
      this.placesService.getPlaceDetails(place.id).subscribe(
        detailedPlace => {
          this.loading = false;
          console.log('Détails complets récupérés:', detailedPlace);

          // Si les détails récupérés ont des coordonnées valides
          if (detailedPlace && detailedPlace.lat !== 0 && detailedPlace.lng !== 0) {
            console.log(`Coordonnées trouvées: lat=${detailedPlace.lat}, lng=${detailedPlace.lng}`);

            // Mettre à jour le lieu et émettre l'événement
            this.selectedPlace = detailedPlace;
            this.placeSelected.emit(detailedPlace);

            // Mettre à jour la liste des lieux
            const index = this.places.findIndex(p => p.id === place.id);
            if (index !== -1) {
              this.places[index] = detailedPlace;
              this.addMarkersToMap(this.places);
            }

            // Afficher le Plus Code
            if (this.plusCodeCard) {
              this.plusCodeCard.show(detailedPlace.lat, detailedPlace.lng);
            }

            // Centrer la carte
            this.centerMapOnPlace(detailedPlace);
          } else {
            console.error('Impossible de récupérer des coordonnées valides pour:', place.id);
            this.errorMessage = `Impossible de localiser "${place.name}" sur la carte. ID: ${place.id}`;
            this.selectedPlace = place;
            this.placeSelected.emit(place);
          }
        },
        error => {
          console.error('Erreur lors de la récupération des détails:', error);
          this.loading = false;
          this.errorMessage = `Erreur lors de la récupération des détails pour "${place.name}"`;
          this.selectedPlace = place;
          this.placeSelected.emit(place);
        }
      );
    } else {
      console.log(`Utilisation directe des coordonnées existantes: lat=${place.lat}, lng=${place.lng}`);
      this.errorMessage = '';

      // Si nous avons déjà des coordonnées, utiliser directement le lieu
      this.selectedPlace = place;
      this.placeSelected.emit(place);

      // Afficher le Plus Code
      if (this.plusCodeCard) {
        this.plusCodeCard.show(place.lat, place.lng);
      }

      this.centerMapOnPlace(place);
      this.addMarkersToMap(this.places);
    }
  }

  // Méthode pour centrer la carte sur un lieu spécifique
  private centerMapOnPlace(place: Place): void {
    if (!this.map || !place || place.lat === 0 && place.lng === 0) {
      console.warn('Impossible de centrer la carte: carte non disponible ou coordonnées invalides');
      return;
    }

    console.log(`Centrage de la carte sur: lat=${place.lat}, lng=${place.lng}`);

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
        (this.markersLayer as L.LayerGroup).clearLayers();
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

  /**
   * Marque une zone sur la carte et affiche les détails
   */
  markZone(place: Place, event: MouseEvent): void {
    // Empêcher la propagation du clic pour ne pas déclencher selectPlace
    event.stopPropagation();

    if (!place || !this.map) return;

    console.log('Marquage de zone pour:', place);

    // Créer l'objet de zone marquée
    this.markedZone = {
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      plusCode: place.plusCode || this.placesService.generatePlusCode(place.lat, place.lng)
    };

    // Nettoyer les marqueurs précédents
    this.clearZoneMarkers();

    // Ajouter le marqueur selon le type de carte
    if (this.providerType === MapProviderType.LEAFLET) {
      this.addLeafletZoneMarker(place);
    } else if (this.providerType === MapProviderType.MAPBOX) {
      this.addMapboxZoneMarker(place);
    }

    // Émettre l'événement de zone marquée
    this.zoneMarked.emit(this.markedZone);
  }

  /**
   * Nettoie la zone marquée
   */
  clearMarkedZone(): void {
    this.markedZone = null;
    this.clearZoneMarkers();
  }

  /**
   * Ajoute un marqueur de zone pour Leaflet
   */
  private addLeafletZoneMarker(place: Place): void {
    if (!this.map) return;
    const leafletMap = this.map as L.Map;

    // Créer le marqueur avec une icône distinctive
    this.zoneMarker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({
        className: 'marked-zone-icon',
        html: '<div class="marked-zone-inner"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(leafletMap);

    // Ajouter un cercle autour du marqueur
    this.zoneCircle = L.circle([place.lat, place.lng], {
      radius: 100, // Rayon de 100m
      color: '#4CAF50',
      fillColor: '#4CAF50',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(leafletMap);

    // Centrer la carte sur le marqueur
    leafletMap.setView([place.lat, place.lng], 16);

    // Ajouter un popup avec les informations
    this.zoneMarker.bindPopup(`
      <div class="marked-zone-popup">
        <h3>${place.name}</h3>
        <p>Coordonnées: ${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}</p>
        <p>Plus Code: ${place.plusCode || this.placesService.generatePlusCode(place.lat, place.lng)}</p>
      </div>
    `).openPopup();
  }

  /**
   * Ajoute un marqueur de zone pour Mapbox
   */
  private addMapboxZoneMarker(place: Place): void {
    if (!this.map) return;
    const mapboxMap = this.map as mapboxgl.Map;

    // Créer l'élément du marqueur
    const el = document.createElement('div');
    el.className = 'marked-zone-mapbox-marker';
    el.innerHTML = '<div class="marked-zone-inner"></div>';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4CAF50';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';

    // Ajouter le marqueur à la carte
    this.zoneMarker = new mapboxgl.Marker(el)
      .setLngLat([place.lng, place.lat])
      .addTo(mapboxMap);

    // Créer un cercle autour du marqueur
    // Vérifier si la source GeoJSON existe déjà
    if (!mapboxMap.getSource(this.zoneGeoJSONSource)) {
      mapboxMap.addSource(this.zoneGeoJSONSource, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [place.lng, place.lat]
          },
          properties: {
            radius: 100 // 100m de rayon
          }
        }
      });

      // Ajouter la couche de cercle
      mapboxMap.addLayer({
        id: 'marked-zone-circle',
        source: this.zoneGeoJSONSource,
        type: 'circle',
        paint: {
          'circle-radius': 100,
          'circle-color': '#4CAF50',
          'circle-opacity': 0.15,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#4CAF50'
        }
      });
    } else {
      // Mettre à jour la source existante
      (mapboxMap.getSource(this.zoneGeoJSONSource) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [place.lng, place.lat]
        },
        properties: {
          radius: 100
        }
      } as any);
    }

    // Centrer la carte sur le marqueur
    mapboxMap.flyTo({
      center: [place.lng, place.lat],
      zoom: 16,
      essential: true
    });

    // Ajouter un popup avec les informations
    new mapboxgl.Popup({ offset: 25 })
      .setLngLat([place.lng, place.lat])
      .setHTML(`
        <div class="marked-zone-popup">
          <h3>${place.name}</h3>
          <p>Coordonnées: ${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}</p>
          <p>Plus Code: ${place.plusCode || this.placesService.generatePlusCode(place.lat, place.lng)}</p>
        </div>
      `)
      .addTo(mapboxMap);
  }

  /**
   * Nettoie les marqueurs de zone
   */
  private clearZoneMarkers(): void {
    if (!this.map) return;

    if (this.providerType === MapProviderType.LEAFLET) {
      const leafletMap = this.map as L.Map;

      if (this.zoneMarker) {
        (this.zoneMarker as L.Marker).remove();
        this.zoneMarker = null;
      }

      if (this.zoneCircle) {
        this.zoneCircle.remove();
        this.zoneCircle = null;
      }
    } else if (this.providerType === MapProviderType.MAPBOX) {
      const mapboxMap = this.map as mapboxgl.Map;

      if (this.zoneMarker) {
        (this.zoneMarker as mapboxgl.Marker).remove();
        this.zoneMarker = null;
      }

      // Supprimer la couche et la source si elles existent
      if (mapboxMap.getLayer('marked-zone-circle')) {
        mapboxMap.removeLayer('marked-zone-circle');
      }

      if (mapboxMap.getSource(this.zoneGeoJSONSource)) {
        mapboxMap.removeSource(this.zoneGeoJSONSource);
      }
    }
  }

  /**
   * Géolocalise l'utilisateur et affiche sa position sur la carte
   */
  locateUser(event: MouseEvent): void {
    // Empêcher le parent de réagir au clic
    event.stopPropagation();

    this.isLocating = !this.isLocating;

    // Nettoyer les ressources précédentes
    this.cleanupLocationResources();

    if (this.isLocating) {
      if (this.providerType === MapProviderType.LEAFLET) {
        this.startLeafletLocation();
      } else if (this.providerType === MapProviderType.MAPBOX) {
        const mapboxMap = this.map as mapboxgl.Map;

        if (mapboxMap.loaded()) {
          this.startMapboxLocation();
        } else {
          console.log('Attente du chargement complet de la carte Mapbox...');
          mapboxMap.once('load', () => {
            console.log('Carte Mapbox chargée, démarrage de la localisation');
            if (this.isLocating) {
              this.startMapboxLocation();
            }
          });
        }
      }
    }
  }

  /**
   * Démarre la localisation avec Leaflet
   */
  private startLeafletLocation(): void {
    const leafletMap = this.map as L.Map;

    try {
      if (!leafletMap || !leafletMap.getContainer()) {
        throw new Error('La carte Leaflet n\'est pas correctement initialisée');
      }

      leafletMap.locate({
        watch: true,
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        timeout: 30000
      });

      // Écouteurs d'événements
      leafletMap.on('locationfound', this.onLeafletLocationFound.bind(this));
      leafletMap.on('locationerror', this.onLeafletLocationError.bind(this));
    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la localisation Leaflet:', err);
      this.isLocating = false;
      this.showLocationError(0, 'Erreur lors de l\'initialisation de la localisation');
    }
  }

  /**
   * Démarre la localisation avec Mapbox
   */
  private startMapboxLocation(): void {
    const mapboxMap = this.map as mapboxgl.Map;

    this.geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 30000
      },
      trackUserLocation: true,
      showAccuracyCircle: false, // Nous allons créer notre propre cercle
      showUserHeading: true
    });

    mapboxMap.addControl(this.geolocateControl);

    // Ajouter une source GeoJSON pour le cercle d'exactitude
    mapboxMap.addSource(this.locationGeoJSONSource, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Événements
    this.geolocateControl.on('geolocate', (e: any) => {
      this.onMapboxLocationFound(e);
    });

    this.geolocateControl.on('error', (e: any) => {
      this.onMapboxLocationError(e);
    });

    // Déclencher la localisation
    setTimeout(() => {
      if (this.geolocateControl && this.isLocating) {
        try {
          this.geolocateControl.trigger();
        } catch (err) {
          console.error('Erreur lors du déclenchement de la géolocalisation:', err);
          this.onMapboxLocationError({
            message: 'Erreur lors de l\'initialisation de la localisation'
          });
        }
      }
    }, 500);
  }

  /**
   * Gère l'événement de position trouvée avec Leaflet
   */
  private onLeafletLocationFound(e: L.LocationEvent): void {
    if (!this.map) return;
    const leafletMap = this.map as L.Map;

    const radius = Math.round(e.accuracy);

    // Supprimer les marqueurs précédents
    if (this.locationMarker) {
      leafletMap.removeLayer(this.locationMarker as L.Marker);
    }

    if (this.locationCircle) {
      leafletMap.removeLayer(this.locationCircle);
    }

    // Créer le marqueur
    this.locationMarker = L.marker(e.latlng, {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div class="location-marker-inner"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(leafletMap);

    // Créer le cercle
    this.locationCircle = L.circle(e.latlng, {
      radius: radius,
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(leafletMap);

    // Mettre à jour les informations de localisation
    this.userLocation = {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      plusCode: this.placesService.generatePlusCode(e.latlng.lat, e.latlng.lng),
      accuracy: e.accuracy
    };

    // Émettre l'événement
    this.locationFound.emit({
      latlng: e.latlng,
      accuracy: e.accuracy
    });
  }

  /**
   * Gère l'événement de position trouvée avec Mapbox
   */
  private onMapboxLocationFound(e: any): void {
    if (!this.map) return;
    const mapboxMap = this.map as mapboxgl.Map;

    const coords = [e.coords.longitude, e.coords.latitude];
    const accuracy = e.coords.accuracy;

    // Créer un marqueur pour la position
    if (this.locationMarker) {
      (this.locationMarker as mapboxgl.Marker).remove();
    }

    // Créer l'élément du marqueur
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = '<div class="location-marker-inner"></div>';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#2196F3';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.4)';

    this.locationMarker = new mapboxgl.Marker({
      element: el
    })
      .setLngLat(coords as [number, number])
      .addTo(mapboxMap);

    // Mettre à jour la source GeoJSON pour le cercle
    const circleGeoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        },
        properties: {
          radius: accuracy
        }
      }]
    };

    (mapboxMap.getSource(this.locationGeoJSONSource) as mapboxgl.GeoJSONSource).setData(circleGeoJson as any);

    // Ajouter la couche du cercle si elle n'existe pas encore
    if (!mapboxMap.getLayer('accuracy-circle-layer')) {
      mapboxMap.addLayer({
        id: 'accuracy-circle-layer',
        source: this.locationGeoJSONSource,
        type: 'circle',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': '#2196F3',
          'circle-opacity': 0.15,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#2196F3'
        }
      });
    }

    // Mettre à jour les informations de localisation
    this.userLocation = {
      lat: e.coords.latitude,
      lng: e.coords.longitude,
      plusCode: this.placesService.generatePlusCode(e.coords.latitude, e.coords.longitude),
      accuracy: e.coords.accuracy
    };

    // Émettre l'événement
    this.locationFound.emit({
      latlng: [e.coords.latitude, e.coords.longitude],
      accuracy: e.coords.accuracy
    });
  }

  /**
   * Gère l'erreur de localisation avec Leaflet
   */
  private onLeafletLocationError(e: L.ErrorEvent): void {
    console.error('Erreur de localisation Leaflet:', e.message);
    this.isLocating = false;

    this.locationError.emit(e);
    this.showLocationError(e.code, e.message);
  }

  /**
   * Gère l'erreur de localisation avec Mapbox
   */
  private onMapboxLocationError(e: any): void {
    console.error('Erreur de localisation Mapbox:', e);
    this.isLocating = false;

    this.locationError.emit(e);

    let errorCode = 0;
    let errorMessage = e.message || 'Erreur inconnue';

    if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
      errorCode = 1; // Permission denied
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('indisponible')) {
      errorCode = 2; // Position unavailable
    } else if (errorMessage.includes('timeout') || errorMessage.includes('expir')) {
      errorCode = 3; // Timeout
    }

    this.showLocationError(errorCode, errorMessage);
  }

  /**
   * Affiche un message d'erreur de localisation
   */
  private showLocationError(code: number, defaultMessage: string): void {
    let message = "Impossible de déterminer votre position: ";
    switch (code) {
      case 1:
        message += "Accès refusé. Veuillez autoriser l'accès à votre position dans les paramètres du navigateur.";
        break;
      case 2:
        message += "Position indisponible. Vérifiez que votre GPS est activé.";
        break;
      case 3:
        message += "Timeout expiré. Veuillez réessayer.";
        break;
      default:
        message += defaultMessage;
    }

    this.errorMessage = message;
  }

  /**
   * Nettoie les ressources de localisation
   */
  private cleanupLocationResources(): void {
    if (!this.map) return;

    if (this.providerType === MapProviderType.LEAFLET) {
      const leafletMap = this.map as L.Map;

      leafletMap.stopLocate();
      leafletMap.off('locationfound');
      leafletMap.off('locationerror');

      if (this.locationMarker) {
        (this.locationMarker as L.Marker).remove();
        this.locationMarker = null;
      }

      if (this.locationCircle) {
        this.locationCircle.remove();
        this.locationCircle = null;
      }
    } else if (this.providerType === MapProviderType.MAPBOX) {
      const mapboxMap = this.map as mapboxgl.Map;

      if (this.geolocateControl) {
        mapboxMap.removeControl(this.geolocateControl);
        this.geolocateControl = null;
      }

      if (this.locationMarker) {
        (this.locationMarker as mapboxgl.Marker).remove();
        this.locationMarker = null;
      }

      if (mapboxMap.getLayer('accuracy-circle-layer')) {
        mapboxMap.removeLayer('accuracy-circle-layer');
      }

      if (mapboxMap.getSource(this.locationGeoJSONSource)) {
        mapboxMap.removeSource(this.locationGeoJSONSource);
      }
    }
  }

  /**
   * Efface la localisation utilisateur
   */
  clearUserLocation(): void {
    this.userLocation = null;
    this.isLocating = false;
    this.cleanupLocationResources();
  }
}
