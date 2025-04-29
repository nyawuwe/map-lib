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

@Component({
  selector: 'lib-places-search',
  templateUrl: './places-search.component.html',
  styleUrls: ['./places-search.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PlacesSearchComponent implements OnInit, OnDestroy {
  @Input() map: L.Map | mapboxgl.Map | null = null;
  @Output() placeSelected = new EventEmitter<Place>();
  @Output() zoneMarked = new EventEmitter<MarkedZone>();

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

  // Propriétés pour la visualisation de la zone marquée
  private zoneMarker: L.Marker | mapboxgl.Marker | null = null;
  private zoneCircle: L.Circle | null = null;
  private zoneGeoJSONSource: string = 'marked-zone-geojson';

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
  private mapReadySubscription: Subscription | null = null;
  private providerChangeHandler: (event: any) => void;

  constructor(
    private placesService: PlacesService,
    private mapService: MapService,
    private mapConfig: MapConfigService,
    @Optional() @Inject(MAPBOX_ACCESS_TOKEN) private mapboxToken: string
  ) {
    // Définir le gestionnaire d'événement pour les changements de fournisseur
    this.providerChangeHandler = this.handleProviderChange.bind(this);
  }

  ngOnInit(): void {
    this.providerType = this.mapService.getCurrentProviderType();

    // Vérifier si le jeton Mapbox est disponible
    this.mapboxTokenAvailable = !!(this.mapboxToken || this.mapConfig.mapboxApiKey);

    console.log('PlacesSearchComponent initialisé avec:');
    console.log('  - Fournisseur de carte:', this.providerType);
    console.log('  - Jeton Mapbox (injecté):', this.mapboxToken ? 'Disponible' : 'Non disponible');
    console.log('  - Jeton Mapbox (config):', this.mapConfig.mapboxApiKey ? 'Disponible' : 'Non disponible');

    // S'abonner aux événements de disponibilité de la carte
    this.mapReadySubscription = this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        const mapInstance = this.mapService.getMap();
        if (mapInstance) {
          this.map = mapInstance;
          this.providerType = this.mapService.getCurrentProviderType();
          this.setupMapEventListeners();

          // Si une recherche est en cours, la relancer avec le nouveau fournisseur
          if (this.places.length > 0 && this.searched) {
            this.removeMarkersFromMap();
            this.addMarkersToMap(this.places);
          }

          // Si une zone est marquée, la redessiner avec le nouveau fournisseur
          if (this.markedZone) {
            const tempMarkedZone = { ...this.markedZone };
            this.clearMarkedZone();
            this.markedZone = tempMarkedZone;

            // Recréer un faux "place" pour pouvoir appeler addLeafletZoneMarker/addMapboxZoneMarker
            const place: Place = {
              id: 'marked-zone',
              name: this.markedZone.name,
              lat: this.markedZone.lat,
              lng: this.markedZone.lng,
              type: 'marked',
              plusCode: this.markedZone.plusCode
            };

            if (this.providerType === MapProviderType.LEAFLET) {
              this.addLeafletZoneMarker(place);
            } else {
              this.addMapboxZoneMarker(place);
            }
          }
        }
      }
    });

    // Écouter les changements de fournisseur
    document.addEventListener('map-provider-change', this.providerChangeHandler);

    this.setupMapEventListeners();

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
          if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
            const center = (this.map as L.Map).getCenter();
            lat = center.lat;
            lng = center.lng;
          } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
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
    if (this.mapReadySubscription) {
      this.mapReadySubscription.unsubscribe();
    }

    // Supprimer les écouteurs d'événements
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('map-provider-change', this.providerChangeHandler);

    // Nettoyer les marqueurs de la carte
    this.removeMarkersFromMap();
    this.clearMarkedZone();
  }

  /**
   * Gère les changements de fournisseur de carte
   */
  private handleProviderChange(event: any): void {
    if (event.detail && typeof event.detail.providerType !== 'undefined') {
      setTimeout(() => {
        // Récupérer la nouvelle instance de la carte
        const mapInstance = this.mapService.getMap();
        if (mapInstance) {
          // Nettoyer les ressources actuelles
          this.removeMarkersFromMap();
          this.clearMarkedZone();

          // Mettre à jour les références
          this.map = mapInstance;
          this.providerType = this.mapService.getCurrentProviderType();

          console.log('PlacesSearchComponent: Mise à jour du fournisseur de carte vers:', this.providerType);

          // Réinitialiser les écouteurs d'événements
          this.setupMapEventListeners();

          // Recréer les marqueurs avec le nouveau fournisseur si nécessaire
          if (this.places.length > 0) {
            this.addMarkersToMap(this.places);
          }

          // Restaurer la zone marquée si elle existe
          if (this.markedZone) {
            const place: Place = {
              id: 'marked-zone',
              name: this.markedZone.name,
              lat: this.markedZone.lat,
              lng: this.markedZone.lng,
              type: 'marked',
              plusCode: this.markedZone.plusCode
            };

            if (this.providerType === MapProviderType.LEAFLET) {
              this.addLeafletZoneMarker(place);
            } else if (this.providerType === MapProviderType.MAPBOX) {
              this.addMapboxZoneMarker(place);
            }
          }
        }
      }, 500); // Délai pour s'assurer que le changement est terminé
    }
  }

  /**
   * Configure les écouteurs d'événements pour la carte
   */
  private setupMapEventListeners(): void {
    if (!this.map) return;

    // Supprimer d'abord les écouteurs existants
    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      const leafletMap = this.map as L.Map;
      leafletMap.off('moveend');

      // Ajouter le nouvel écouteur
      leafletMap.on('moveend', () => {
        if (this.autoSearch) {
          this.searchPlacesAtCenter();
        }
      });
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
      const mapboxMap = this.map as mapboxgl.Map;
      // Mapbox n'a pas de méthode .off() directe, mais on peut utiliser un identificateur unique
      // pour les gestionnaires d'événements. Pour simplifier, on ajoute simplement un nouveau gestionnaire.
      mapboxMap.on('moveend', () => {
        if (this.autoSearch) {
          this.searchPlacesAtCenter();
        }
      });
    }
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

            // Centrer la carte
            this.centerMapOnPlace(detailedPlace);
          } else {
            console.error('Impossible de récupérer des coordonnées valides pour:', place.id);

            // Afficher les informations d'erreur à l'utilisateur
            this.errorMessage = `Impossible de localiser "${place.name}" sur la carte. ID: ${place.id}`;

            this.selectedPlace = place;
            this.placeSelected.emit(place);
            // Ne pas centrer la carte sans coordonnées valides
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
      // Effacer tout message d'erreur précédent
      this.errorMessage = '';

      // Si nous avons déjà des coordonnées, utiliser directement le lieu
      this.selectedPlace = place;
      this.placeSelected.emit(place);
      this.centerMapOnPlace(place);

      // Mettre en évidence le lieu sélectionné dans la liste en actualisant les marqueurs
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
    if (!this.map || !(this.map instanceof mapboxgl.Map)) return;
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

    // Convertir le rayon en mètres vers des pixels
    const pixelsPerMeter = this.metersToPixelsAtLatitude(100, place.lat, mapboxMap.getZoom());

    // Créer un cercle autour du marqueur
    if (!mapboxMap.getSource(this.zoneGeoJSONSource)) {
      try {
        mapboxMap.addSource(this.zoneGeoJSONSource, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [place.lng, place.lat]
            },
            properties: {
              radius_meters: 100, // 100m de rayon
              radius_pixels: pixelsPerMeter
            }
          }
        });

        // Ajouter la couche de cercle
        mapboxMap.addLayer({
          id: 'marked-zone-circle',
          source: this.zoneGeoJSONSource,
          type: 'circle',
          paint: {
            'circle-radius': ['get', 'radius_pixels'],
            'circle-color': '#4CAF50',
            'circle-opacity': 0.15,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#4CAF50'
          }
        });

        // Mettre à jour le rayon lors du zoom
        mapboxMap.on('zoom', () => {
          if (this.markedZone && this.map instanceof mapboxgl.Map) {
            try {
              const newPixels = this.metersToPixelsAtLatitude(
                100,
                this.markedZone.lat,
                (this.map as mapboxgl.Map).getZoom()
              );

              const updatedData = {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [this.markedZone.lng, this.markedZone.lat]
                },
                properties: {
                  radius_meters: 100,
                  radius_pixels: newPixels
                }
              };

              if (mapboxMap.getSource(this.zoneGeoJSONSource)) {
                (mapboxMap.getSource(this.zoneGeoJSONSource) as mapboxgl.GeoJSONSource)
                  .setData(updatedData as any);
              }
            } catch (error) {
              console.error('Erreur lors de la mise à jour du rayon:', error);
            }
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'ajout du cercle de la zone:', error);
      }
    } else {
      // Mettre à jour la source existante
      try {
        (mapboxMap.getSource(this.zoneGeoJSONSource) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [place.lng, place.lat]
          },
          properties: {
            radius_meters: 100,
            radius_pixels: pixelsPerMeter
          }
        } as any);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du cercle de la zone:', error);
      }
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
   * Convertit une distance en mètres en pixels à une latitude et un niveau de zoom donnés
   */
  private metersToPixelsAtLatitude(meters: number, latitude: number, zoom: number): number {
    // Rayon de la Terre en mètres
    const earthRadius = 6378137;

    // Largeur d'un pixel au zoom 0 en mètres
    const meterPerPixelAtZoom0 = 2 * Math.PI * earthRadius / 512;

    // Facteur d'échelle en fonction du zoom
    const zoomScale = Math.pow(2, zoom);

    // Ajustement pour la projection Mercator (dépend de la latitude)
    const latitudeRadians = latitude * Math.PI / 180;
    const latitudeAdjustment = Math.cos(latitudeRadians);

    // Conversion finale: mètres -> pixels
    // Pour éviter des cercles trop grands, on limite à 100 pixels maximum
    const pixelRadius = Math.min(
      meters / (meterPerPixelAtZoom0 / zoomScale) / latitudeAdjustment,
      100
    );

    return pixelRadius;
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
}
