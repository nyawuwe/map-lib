import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import { IconService } from './icon.service';
import { PopupService } from './popup.service';
import { PopupInfo } from '../models/popup-info.model';
import { MapService } from './map.service';
import { MapProviderType } from '../models/map-provider.model';
import { MapConfigService } from './map-config.service';

export const GOOGLE_PLACES_API_KEY = new InjectionToken<string>('GOOGLE_PLACES_API_KEY');
export const MAPBOX_ACCESS_TOKEN = new InjectionToken<string>('MAPBOX_ACCESS_TOKEN');

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  rating?: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string[];
  photos?: string[];
  plusCode?: string;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  description?: string;
  source: 'google' | 'mapbox';
}

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private placesApiUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private placeDetailsApiUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
  private mapboxGeocodingUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
  private googleAutocompleteUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

  // Pour suivre l'état de validité de la clé Google
  private isGoogleKeyValid = new BehaviorSubject<boolean | null>(null);
  private googleKeyChecked = false;

  // Jeton Mapbox (obtenu soit par injection, soit via MapConfigService)
  private get effectiveMapboxToken(): string {
    // Utiliser le jeton injecté OU celui du service de configuration
    return this.mapboxToken || this.mapConfig.mapboxApiKey;
  }

  constructor(
    private http: HttpClient,
    private iconService: IconService,
    private popupService: PopupService,
    private mapService: MapService,
    private mapConfig: MapConfigService,
    @Inject(GOOGLE_PLACES_API_KEY) private googleApiKey: string,
    @Optional() @Inject(MAPBOX_ACCESS_TOKEN) private mapboxToken: string
  ) {
    // Log pour le débogage
    console.log('PlacesService initialisé avec:');
    console.log('  - Clé Google:', this.googleApiKey ? 'Disponible' : 'Non disponible');
    console.log('  - Jeton Mapbox (injecté):', this.mapboxToken ? 'Disponible' : 'Non disponible');
    console.log('  - Jeton Mapbox (config):', this.mapConfig.mapboxApiKey ? 'Disponible' : 'Non disponible');
  }

  /**
   * Vérifie si la clé Google Places API est valide
   */
  private checkGoogleApiKey(): Observable<boolean> {
    if (this.googleKeyChecked) {
      return this.isGoogleKeyValid.asObservable().pipe(
        map(isValid => isValid === true) // Conversion en boolean stricte
      );
    }

    const params = {
      location: '48.8566,2.3522', // Paris, comme test
      radius: '100',
      key: this.googleApiKey
    };

    return this.http.get<any>(this.placesApiUrl, { params }).pipe(
      map(response => {
        const isValid = response && response.status !== 'REQUEST_DENIED';
        this.isGoogleKeyValid.next(isValid);
        this.googleKeyChecked = true;
        console.log(`Clé Google Places: ${isValid ? 'valide' : 'invalide'}`);
        return isValid;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isGoogleKeyValid.next(false);
        this.googleKeyChecked = true;
        console.log('Clé Google Places invalide:', error);
        return of(false);
      })
    );
  }

  /**
   * Récupère les points d'intérêt autour d'un emplacement en utilisant l'API appropriée
   */
  getNearbyPlaces(lat: number, lng: number, radius: number = 1000, type: string = ''): Observable<Place[]> {
    console.log(`getNearbyPlaces appelé: lat=${lat}, lng=${lng}, radius=${radius}, type=${type}`);

    // Vérifier d'abord si le jeton Mapbox est disponible (injecté OU dans la config)
    const mapboxToken = this.effectiveMapboxToken;

    if (!mapboxToken) {
      console.warn("Aucun jeton Mapbox disponible. Utilisation de Google Places uniquement.");
      return this.getGooglePlaces(lat, lng, radius, type).pipe(
        // S'assurer que tous les lieux ont des coordonnées valides
        map(places => this.ensureValidCoordinates(places, lat, lng))
      );
    }

    const currentProvider = this.mapService.getCurrentProviderType();
    console.log('Fournisseur de carte actuel:', currentProvider);

    // Si on utilise Mapbox comme fournisseur, on utilise directement l'API Mapbox
    if (currentProvider === MapProviderType.MAPBOX) {
      console.log('Utilisation de Mapbox pour la recherche (fournisseur actuel)');
      return this.getMapboxPlaces(lng, lat, radius, type).pipe(
        map(places => this.ensureValidCoordinates(places, lat, lng))
      );
    }

    // Si la clé Google a déjà été vérifiée
    if (this.googleKeyChecked) {
      if (this.isGoogleKeyValid.getValue()) {
        console.log('Utilisation de Google Places (clé valide)');
        return this.getGooglePlaces(lat, lng, radius, type).pipe(
          map(places => this.ensureValidCoordinates(places, lat, lng))
        );
      } else {
        console.log("Utilisation de l'API Mapbox (clé Google invalide)");
        return this.getMapboxPlaces(lng, lat, radius, type).pipe(
          map(places => this.ensureValidCoordinates(places, lat, lng))
        );
      }
    }

    // Vérifier la clé Google et choisir l'API appropriée
    console.log('Vérification de la clé Google...');
    return this.checkGoogleApiKey().pipe(
      switchMap(isValid => {
        if (isValid) {
          console.log('Clé Google valide, utilisation de Google Places');
          return this.getGooglePlaces(lat, lng, radius, type);
        } else {
          console.log("Utilisation de l'API Mapbox pour la recherche (clé Google invalide)");
          return this.getMapboxPlaces(lng, lat, radius, type);
        }
      }),
      map(places => this.ensureValidCoordinates(places, lat, lng))
    );
  }

  /**
   * S'assure que tous les lieux ont des coordonnées valides
   * Remplace les coordonnées invalides (0,0) par les coordonnées de la recherche
   */
  private ensureValidCoordinates(places: Place[], searchLat: number, searchLng: number): Place[] {
    return places.map(place => {
      if (place.lat === 0 && place.lng === 0) {
        console.warn(`Lieu sans coordonnées valides: ${place.id}, ${place.name}. Utilisation des coordonnées de recherche.`);
        return {
          ...place,
          lat: searchLat,
          lng: searchLng,
          plusCode: this.generatePlusCode(searchLat, searchLng)
        };
      }
      return place;
    });
  }

  /**
   * Récupère les points d'intérêt via l'API Google Places
   */
  private getGooglePlaces(lat: number, lng: number, radius: number, type: string): Observable<Place[]> {
    const params = {
      location: `${lat},${lng}`,
      radius: radius.toString(),
      type: type,
      key: this.googleApiKey
    };

    return this.http.get<any>(this.placesApiUrl, { params }).pipe(
      map(response => {
        if (response.status === 'REQUEST_DENIED') {
          console.warn('Google Places API a refusé la requête:', response.error_message);
          this.isGoogleKeyValid.next(false);
          throw new Error(response.error_message || 'Clé API invalide');
        }

        if (!response.results || response.results.length === 0) {
          // Fallback: créer un lieu avec Plus Code
          return [this.createFallbackPlace(lat, lng, type)];
        }

        return response.results.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          type: place.types[0],
          rating: place.rating,
          address: place.vicinity,
          plusCode: this.generatePlusCode(place.geometry.location.lat, place.geometry.location.lng)
        }));
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des points d\'intérêt (Google):', error);
        // Marquer la clé comme invalide si on obtient une erreur d'autorisation
        if (error.status === 403 || error.status === 401 ||
          (error.message && error.message.includes('API'))) {
          this.isGoogleKeyValid.next(false);
        }

        // Fallback en cas d'erreur: essayer avec Mapbox si disponible
        if (this.effectiveMapboxToken) {
          console.log("Basculement sur l'API Mapbox suite à une erreur Google Places");
          return this.getMapboxPlaces(lng, lat, radius, type);
        }

        // Dernier recours: créer un lieu par défaut
        return of([this.createFallbackPlace(lat, lng, type)]);
      })
    );
  }

  /**
   * Récupère les points d'intérêt via l'API Mapbox Geocoding
   */
  private getMapboxPlaces(lng: number, lat: number, radius: number, query: string): Observable<Place[]> {
    // Formatage de la requête pour Mapbox
    const formattedQuery = query.replace(/\s+/g, '%20');
    // Convertir le rayon de mètres en km pour le paramètre proximity
    const proximityRadius = Math.min(radius / 1000, 50); // Mapbox limite à 50km

    // Utiliser le jeton effectif (injecté ou dans la config)
    const mapboxToken = this.effectiveMapboxToken;

    if (!mapboxToken) {
      console.error("Aucun jeton Mapbox disponible pour effectuer la recherche");
      return of([this.createFallbackPlace(lat, lng, query)]);
    }

    // URL de l'API Mapbox Geocoding avec recherche par proximité
    const url = `${this.mapboxGeocodingUrl}/${formattedQuery}.json`;

    const params = {
      access_token: mapboxToken,
      proximity: `${lng},${lat}`,
      types: this.mapboxCategoryFromType(query),
      limit: '10'
    };

    return this.http.get<any>(url, { params }).pipe(
      tap(response => console.log('Résultats Mapbox recherche:', JSON.stringify(response))),
      map(response => {
        if (!response.features || response.features.length === 0) {
          // Fallback si aucun résultat
          return [this.createFallbackPlace(lat, lng, query)];
        }

        // Filtrer les résultats qui sont trop éloignés de la position actuelle
        return response.features
          .map((feature: any) => {
            const [featureLng, featureLat] = feature.center;
            const distance = this.calculateDistance(featureLat, featureLng, lat, lng);

            // Ne garder que les lieux dans le rayon spécifié
            if (distance <= radius) {
              // Créer un ID composé qui inclut les coordonnées pour faciliter la récupération ultérieure
              // Format: "coordID:lat:lng:nom"
              const coordID = `${featureLat}:${featureLng}:${feature.text}`;

              return {
                id: coordID, // Utiliser l'ID avec coordonnées intégrées
                name: feature.text,
                lat: featureLat,
                lng: featureLng,
                type: this.mapboxTypeToCategory(feature.properties?.category || feature.place_type[0] || query),
                address: feature.place_name,
                plusCode: this.generatePlusCode(featureLat, featureLng)
              };
            }
            return null;
          })
          .filter((place: Place | null) => place !== null) as Place[];
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des points d\'intérêt (Mapbox):', error);
        return of([this.createFallbackPlace(lat, lng, query)]);
      })
    );
  }

  /**
   * Convertit un type de lieu en catégorie Mapbox pour la recherche
   */
  private mapboxCategoryFromType(type: string): string {
    // Mapbox utilise des catégories différentes de Google Places
    const typeMap: { [key: string]: string } = {
      restaurant: 'poi.restaurant',
      cafe: 'poi.cafe',
      bar: 'poi.bar',
      store: 'poi.shop',
      shopping_mall: 'poi.shop',
      hotel: 'poi.hotel',
      museum: 'poi.museum',
      park: 'poi.park',
      school: 'poi.school',
      hospital: 'poi.hospital',
      transit_station: 'poi.transit',
      airport: 'poi.airport'
    };

    return typeMap[type] || 'poi';
  }

  /**
   * Convertit une catégorie Mapbox en type de lieu
   */
  private mapboxTypeToCategory(category: string): string {
    // Conversion inverse de mapboxCategoryFromType
    if (category.startsWith('poi.')) {
      category = category.substring(4);
    }

    // Table de correspondance plus complète pour les types Mapbox
    const categoryMap: { [key: string]: string } = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      shop: 'store',
      hotel: 'hotel',
      museum: 'museum',
      park: 'park',
      school: 'school',
      hospital: 'hospital',
      transit: 'transit_station',
      airport: 'airport',
      place: 'location'
    };

    return categoryMap[category] || 'default';
  }

  /**
   * Calcule la distance entre deux coordonnées (formule de Haversine)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  private createFallbackPlace(lat: number, lng: number, type: string): Place {
    return {
      id: `fallback-${lat}-${lng}`,
      name: type ? `Lieu de type: ${type}` : 'Position actuelle',
      lat: lat,
      lng: lng,
      type: type || 'location',
      plusCode: this.generatePlusCode(lat, lng)
    };
  }

  /**
   * Génère un Plus Code à partir de coordonnées géographiques
   */
  generatePlusCode(lat: number, lng: number): string {
    // Préserver les quadrants
    const latPrefix = lat >= 0 ? 'N' : 'S';
    const lngPrefix = lng >= 0 ? 'E' : 'W';

    // Convertir en chaîne de 4 chiffres
    const latStr = Math.abs(lat).toFixed(4).replace('.', '');
    const lngStr = Math.abs(lng).toFixed(4).replace('.', '');

    return `${latPrefix}${latStr.substring(0, 4)}-${lngPrefix}${lngStr.substring(0, 4)}`;
  }

  /**
   * Récupère les détails d'un point d'intérêt
   */
  getPlaceDetails(placeId: string): Observable<Place> {
    console.log('getPlaceDetails appelé avec ID:', placeId);
    const currentProvider = this.mapService.getCurrentProviderType();
    console.log('Fournisseur de carte actuel:', currentProvider);
    console.log('État de la clé Google:', this.isGoogleKeyValid.getValue(), 'vérifiée:', this.googleKeyChecked);
    console.log('Token Mapbox disponible:', !!this.effectiveMapboxToken);

    // Si on utilise Mapbox ou si la clé Google est invalide
    if (currentProvider === MapProviderType.MAPBOX ||
      (this.googleKeyChecked && !this.isGoogleKeyValid.getValue())) {
      console.log('Utilisation de Mapbox pour les détails du lieu');
      // Pour Mapbox, nous utilisons l'endpoint de recherche pour obtenir plus de détails
      return this.getMapboxPlaceDetails(placeId);
    } else {
      console.log('Tentative avec Google Places pour les détails du lieu');
      return this.getGooglePlaceDetails(placeId).pipe(
        catchError(error => {
          console.error("Erreur lors de la récupération des détails Google, basculement sur Mapbox:", error);
          if (this.effectiveMapboxToken) {
            return this.getMapboxPlaceDetails(placeId);
          }
          return of({} as Place);
        })
      );
    }
  }

  /**
   * Récupère les détails via l'API Google Places
   */
  private getGooglePlaceDetails(placeId: string): Observable<Place> {
    console.log('Début getGooglePlaceDetails avec ID:', placeId);
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,photos,rating,geometry',
      key: this.googleApiKey
    };

    console.log('Requête Google Places Details:', params);

    return this.http.get<any>(this.placeDetailsApiUrl, { params }).pipe(
      tap(response => console.log('Réponse Google:', response)),
      map(response => {
        if (response.result) {
          const place = response.result;
          // Récupérer les coordonnées depuis geometry.location
          const lat = place.geometry?.location?.lat || 0;
          const lng = place.geometry?.location?.lng || 0;

          console.log(`Coordonnées Google extraites: lat=${lat}, lng=${lng}`);

          return {
            id: placeId,
            name: place.name,
            lat: lat,
            lng: lng,
            type: place.types?.[0] || '',
            rating: place.rating,
            address: place.formatted_address,
            phone: place.formatted_phone_number,
            website: place.website,
            openingHours: place.opening_hours?.weekday_text || [],
            photos: place.photos?.map((photo: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.googleApiKey}`
            ) || [],
            plusCode: this.generatePlusCode(lat, lng)
          };
        }
        console.warn('Aucun résultat dans la réponse Google Places');
        return {} as Place;
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des détails du point d\'intérêt (Google):', error);
        return of({} as Place);
      })
    );
  }

  /**
   * Récupère les détails via l'API Mapbox
   */
  private getMapboxPlaceDetails(featureId: string): Observable<Place> {
    console.log('Début getMapboxPlaceDetails avec ID:', featureId);

    // Vérifier si featureId est un objet JSON encodé (cas où nous avons déjà les informations)
    try {
      const decodedFeature = JSON.parse(featureId);
      if (decodedFeature && typeof decodedFeature === 'object' && decodedFeature.lat && decodedFeature.lng) {
        console.log('ID est un objet JSON encodé avec coordonnées:', decodedFeature);
        return of({
          id: featureId,
          name: decodedFeature.name || 'Lieu',
          lat: decodedFeature.lat,
          lng: decodedFeature.lng,
          type: decodedFeature.type || 'default',
          address: decodedFeature.address || 'Information non disponible',
          plusCode: this.generatePlusCode(decodedFeature.lat, decodedFeature.lng)
        });
      }
    } catch (e) {
      // Ce n'est pas un JSON valide, continuons avec le traitement normal
    }

    // Vérifier si le jeton Mapbox est disponible
    const mapboxToken = this.effectiveMapboxToken;

    if (!mapboxToken) {
      console.error("Aucun jeton Mapbox disponible pour récupérer les détails du lieu");
      return of({
        id: featureId,
        name: 'Lieu (détails indisponibles)',
        lat: 0,
        lng: 0,
        type: 'default',
        address: 'Information non disponible',
        plusCode: ''
      } as Place);
    }

    // Récupérer les identifiants originaux s'ils sont stockés dans le format "placeData:lat:lng"
    if (featureId.startsWith('placeData:')) {
      const parts = featureId.split(':');
      if (parts.length >= 3) {
        const lat = parseFloat(parts[1]);
        const lng = parseFloat(parts[2]);
        const name = parts[3] || 'Lieu';

        console.log(`ID au format spécial placeData, coordonnées extraites: lat=${lat}, lng=${lng}`);

        return of({
          id: featureId,
          name: name,
          lat: lat,
          lng: lng,
          type: 'default',
          address: 'Information disponible via les coordonnées',
          plusCode: this.generatePlusCode(lat, lng)
        });
      }
    }

    // Si l'ID a le format Mapbox (id.feature) ou est un ID numérique simple
    // Tenter une recherche par géocodage inverse à partir des coordonnées stockées dans l'ID si possible
    if (featureId.includes(':')) {
      const coords = featureId.split(':');
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);

      if (!isNaN(lat) && !isNaN(lng)) {
        console.log(`ID contient des coordonnées séparées par ':': lat=${lat}, lng=${lng}`);
        // Effectuer une recherche par géocodage inverse
        const reverseUrl = `${this.mapboxGeocodingUrl}/${lng},${lat}.json`;
        const params = {
          access_token: mapboxToken,
          types: 'poi,address,place',
          limit: '1'
        };

        console.log('Requête de géocodage inverse Mapbox:', reverseUrl, params);

        return this.http.get<any>(reverseUrl, { params }).pipe(
          tap(response => console.log('Réponse géocodage inverse Mapbox:', JSON.stringify(response))),
          map(response => {
            if (response && response.features && response.features.length > 0) {
              const feature = response.features[0];
              return {
                id: featureId,
                name: feature.text || feature.place_name || 'Lieu',
                lat: lat,
                lng: lng,
                type: this.mapboxTypeToCategory(feature.properties?.category || feature.place_type[0] || 'default'),
                address: feature.place_name || 'Information non disponible',
                plusCode: this.generatePlusCode(lat, lng)
              };
            }

            // Si aucun résultat n'est trouvé, retourner les coordonnées directement
            return {
              id: featureId,
              name: 'Lieu',
              lat: lat,
              lng: lng,
              type: 'default',
              address: `Coordonnées: ${lat}, ${lng}`,
              plusCode: this.generatePlusCode(lat, lng)
            };
          }),
          catchError(error => {
            console.error('Erreur lors du géocodage inverse:', error);
            // En cas d'erreur, utiliser les coordonnées directement
            return of({
              id: featureId,
              name: 'Lieu',
              lat: lat,
              lng: lng,
              type: 'default',
              address: `Coordonnées: ${lat}, ${lng}`,
              plusCode: this.generatePlusCode(lat, lng)
            });
          })
        );
      }
    }

    // Pour les autres formats d'ID Mapbox, essayer une recherche normale
    console.log('Recherche standard pour ID Mapbox:', featureId);

    // URL de l'API Mapbox Geocoding avec recherche par texte
    const url = `${this.mapboxGeocodingUrl}/${featureId}.json`;

    const params = {
      access_token: mapboxToken,
      types: 'poi,address,place',
      limit: '1'
    };

    console.log('Requête Mapbox par ID:', url, params);

    return this.http.get<any>(url, { params }).pipe(
      tap(response => console.log('Réponse Mapbox par ID:', JSON.stringify(response))),
      map(response => {
        // Si la recherche par ID a retourné des résultats
        if (response && response.features && response.features.length > 0) {
          const feature = response.features[0];
          const coords = feature.center || feature.geometry?.coordinates || [0, 0];
          const lng = coords[0];
          const lat = coords[1];

          console.log(`Coordonnées trouvées: lat=${lat}, lng=${lng}`);

          return {
            id: featureId,
            name: feature.text || feature.place_name || 'Lieu',
            lat: lat,
            lng: lng,
            type: this.mapboxTypeToCategory(feature.properties?.category || feature.place_type[0] || 'default'),
            address: feature.place_name || 'Information non disponible',
            plusCode: this.generatePlusCode(lat, lng)
          };
        }

        // Si aucun résultat n'est trouvé, essayer de voir si l'ID contient des coordonnées numériques
        if (!isNaN(parseFloat(featureId))) {
          // Peut-être un ID numérique simple, utiliser comme une approximation de position
          const numericId = parseFloat(featureId);
          // Essayer de l'interpréter comme une position approximative
          console.warn('Aucun résultat trouvé, tentative d\'utiliser l\'ID comme approximation:', numericId);

          return {
            id: featureId,
            name: 'Position approximative',
            lat: 0,  // Ne pas utiliser numericId comme coordonnée, c'est trop spéculatif
            lng: 0,
            type: 'default',
            address: 'Information non disponible',
            plusCode: ''
          };
        }

        console.warn('Aucun résultat trouvé pour l\'ID:', featureId);
        return {
          id: featureId,
          name: 'Lieu (non trouvé)',
          lat: 0,
          lng: 0,
          type: 'default',
          address: 'Information non disponible',
          plusCode: ''
        } as Place;
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des détails Mapbox:', error);
        return of({
          id: featureId,
          name: 'Lieu (erreur)',
          lat: 0,
          lng: 0,
          type: 'default',
          address: 'Erreur lors de la récupération des détails',
          plusCode: ''
        } as Place);
      })
    );
  }

  /**
   * Crée un marqueur pour un point d'intérêt
   */
  createPlaceMarker(place: Place): L.Marker {
    const iconOptions = this.getIconOptionsForPlaceType(place.type);
    const popupInfo = this.createPopupInfoForPlace(place);

    return this.iconService.createMarkerWithIcon(
      [place.lat, place.lng],
      iconOptions,
      popupInfo
    );
  }

  /**
   * Retourne les options d'icône en fonction du type de lieu
   */
  private getIconOptionsForPlaceType(type: string): any {
    const iconMap: { [key: string]: any } = {
      restaurant: { iconClass: 'fas fa-utensils', markerColor: '#e74c3c' },
      cafe: { iconClass: 'fas fa-coffee', markerColor: '#8b4513' },
      bar: { iconClass: 'fas fa-glass-martini-alt', markerColor: '#2c3e50' },
      store: { iconClass: 'fas fa-shopping-bag', markerColor: '#3498db' },
      shopping_mall: { iconClass: 'fas fa-shopping-cart', markerColor: '#9b59b6' },
      hotel: { iconClass: 'fas fa-hotel', markerColor: '#f39c12' },
      museum: { iconClass: 'fas fa-landmark', markerColor: '#1abc9c' },
      park: { iconClass: 'fas fa-tree', markerColor: '#27ae60' },
      school: { iconClass: 'fas fa-school', markerColor: '#3498db' },
      hospital: { iconClass: 'fas fa-hospital', markerColor: '#e74c3c' },
      transit_station: { iconClass: 'fas fa-train', markerColor: '#34495e' },
      airport: { iconClass: 'fas fa-plane', markerColor: '#7f8c8d' },
      default: { iconClass: 'fas fa-map-marker-alt', markerColor: '#95a5a6' }
    };

    return iconMap[type] || iconMap['default'];
  }

  /**
   * Crée les informations de popup pour un point d'intérêt
   */
  private createPopupInfoForPlace(place: Place): PopupInfo {
    const details: { [key: string]: string } = {};

    if (place.rating) {
      details['Note'] = `${place.rating}/5`;
    }

    if (place.address) {
      details['Adresse'] = place.address;
    }

    if (place.phone) {
      details['Téléphone'] = place.phone;
    }

    if (place.website) {
      details['Site web'] = place.website;
    }

    return {
      title: place.name,
      description: place.type ? `Type: ${place.type}` : '',
      details: details,
      imageSrc: place.photos && place.photos.length > 0 ? place.photos[0] : undefined
    };
  }

  /**
   * Récupère des suggestions de lieux basées sur le texte saisi par l'utilisateur
   * @param query Texte saisi par l'utilisateur
   * @param lat Latitude actuelle de la carte (optionnelle)
   * @param lng Longitude actuelle de la carte (optionnelle)
   * @param radius Rayon de recherche en mètres (optionnel, par défaut 50000)
   * @returns Observable avec un tableau de suggestions
   */
  getPlaceSuggestions(query: string, lat?: number, lng?: number, radius: number = 50000): Observable<PlaceSuggestion[]> {
    if (!query.trim()) {
      return of([]);
    }

    // Déterminer quelle API utiliser en fonction des tokens disponibles et de leur validité
    const mapboxToken = this.effectiveMapboxToken;
    const currentProvider = this.mapService.getCurrentProviderType();

    // Si on utilise Mapbox ou si le token Mapbox est disponible et la clé Google invalide
    if (currentProvider === MapProviderType.MAPBOX ||
      (mapboxToken && this.googleKeyChecked && !this.isGoogleKeyValid.getValue())) {
      return this.getMapboxSuggestions(query, lng, lat, radius);
    }

    // Si la clé Google a déjà été vérifiée et est valide
    if (this.googleKeyChecked && this.isGoogleKeyValid.getValue()) {
      return this.getGoogleSuggestions(query, lat, lng, radius);
    }

    // Vérifier la clé Google et choisir l'API appropriée
    return this.checkGoogleApiKey().pipe(
      switchMap(isValid => {
        if (isValid) {
          return this.getGoogleSuggestions(query, lat, lng, radius);
        } else if (mapboxToken) {
          console.log("Utilisation de l'API Mapbox pour l'autocomplétion (clé Google invalide)");
          return this.getMapboxSuggestions(query, lng, lat, radius);
        } else {
          // Aucune API disponible
          console.error("Aucune API disponible pour l'autocomplétion");
          return of([]);
        }
      })
    );
  }

  /**
   * Récupère des suggestions via l'API Google Places Autocomplete
   */
  private getGoogleSuggestions(query: string, lat?: number, lng?: number, radius: number = 50000): Observable<PlaceSuggestion[]> {
    const params: any = {
      input: query,
      key: this.googleApiKey,
      language: 'fr' // Langue française par défaut
      // Suppression de "components: 'country:fr'" pour permettre une recherche mondiale
    };

    // Ajouter le biais de localisation si des coordonnées sont fournies
    if (lat !== undefined && lng !== undefined) {
      params.location = `${lat},${lng}`;
      params.radius = radius.toString();
    }

    return this.http.get<any>(this.googleAutocompleteUrl, { params }).pipe(
      map(response => {
        if (response.status === 'REQUEST_DENIED') {
          console.warn('Google Places API a refusé la requête:', response.error_message);
          this.isGoogleKeyValid.next(false);
          throw new Error(response.error_message || 'Clé API invalide');
        }

        if (!response.predictions || response.predictions.length === 0) {
          return [];
        }

        return response.predictions.map((prediction: any) => ({
          id: prediction.place_id,
          name: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
          description: prediction.description,
          source: 'google' as const
        }));
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des suggestions (Google):', error);

        // Marquer la clé comme invalide si on obtient une erreur d'autorisation
        if (error.status === 403 || error.status === 401 ||
          (error.message && error.message.includes('API'))) {
          this.isGoogleKeyValid.next(false);
        }

        // Fallback sur Mapbox si disponible
        if (this.effectiveMapboxToken) {
          return this.getMapboxSuggestions(query, lng, lat, radius);
        }

        return of([]);
      })
    );
  }

  /**
   * Récupère des suggestions via l'API Mapbox Geocoding
   */
  private getMapboxSuggestions(query: string, lng?: number, lat?: number, radius: number = 50000): Observable<PlaceSuggestion[]> {
    // Formatage de la requête pour Mapbox
    const formattedQuery = query.replace(/\s+/g, '%20');

    // Vérifier si le jeton Mapbox est disponible
    const mapboxToken = this.effectiveMapboxToken;
    if (!mapboxToken) {
      console.error("Aucun jeton Mapbox disponible pour l'autocomplétion");
      return of([]);
    }

    // Configurer les paramètres de l'API
    const params: any = {
      access_token: mapboxToken,
      autocomplete: true,
      language: 'fr', // Langue française par défaut
      // Suppression de "country: 'fr'" pour permettre une recherche mondiale
      types: 'poi,address,place', // Types de lieux à inclure
      limit: 5 // Nombre de suggestions
    };

    // Ajouter le biais de proximité si des coordonnées sont fournies
    if (lng !== undefined && lat !== undefined) {
      // Mapbox utilise [longitude, latitude]
      params.proximity = `${lng},${lat}`;
    }

    // URL de l'API Mapbox Geocoding
    const url = `${this.mapboxGeocodingUrl}/${formattedQuery}.json`;

    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        if (!response.features || response.features.length === 0) {
          return [];
        }

        return response.features.map((feature: any) => ({
          id: feature.id,
          name: feature.text,
          description: feature.place_name,
          source: 'mapbox' as const
        }));
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des suggestions (Mapbox):', error);
        return of([]);
      })
    );
  }
}
