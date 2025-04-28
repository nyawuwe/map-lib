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

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private placesApiUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private placeDetailsApiUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
  private mapboxGeocodingUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

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
    // Vérifier d'abord si le jeton Mapbox est disponible (injecté OU dans la config)
    const mapboxToken = this.effectiveMapboxToken;

    if (!mapboxToken) {
      console.warn("Aucun jeton Mapbox disponible. Utilisation de Google Places uniquement.");
      return this.getGooglePlaces(lat, lng, radius, type);
    }

    const currentProvider = this.mapService.getCurrentProviderType();

    // Si on utilise Mapbox comme fournisseur, on utilise directement l'API Mapbox
    if (currentProvider === MapProviderType.MAPBOX) {
      return this.getMapboxPlaces(lng, lat, radius, type);
    }

    // Si la clé Google a déjà été vérifiée
    if (this.googleKeyChecked) {
      return this.isGoogleKeyValid.getValue()
        ? this.getGooglePlaces(lat, lng, radius, type)
        : this.getMapboxPlaces(lng, lat, radius, type);
    }

    // Vérifier la clé Google et choisir l'API appropriée
    return this.checkGoogleApiKey().pipe(
      switchMap(isValid => {
        if (isValid) {
          return this.getGooglePlaces(lat, lng, radius, type);
        } else {
          console.log("Utilisation de l'API Mapbox pour la recherche (clé Google invalide)");
          return this.getMapboxPlaces(lng, lat, radius, type);
        }
      })
    );
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
      map(response => {
        if (!response.features || response.features.length === 0) {
          // Fallback si aucun résultat
          return [this.createFallbackPlace(lat, lng, query)];
        }

        // Filtrer les résultats qui sont trop éloignés de la position actuelle
        return response.features
          .map((feature: any) => {
            const [lng, lat] = feature.center;
            const distance = this.calculateDistance(lat, lng, lat, lng);

            // Ne garder que les lieux dans le rayon spécifié
            if (distance <= radius) {
              return {
                id: feature.id,
                name: feature.text,
                lat: lat,
                lng: lng,
                type: this.mapboxTypeToCategory(feature.properties?.category || feature.place_type[0] || query),
                address: feature.place_name,
                plusCode: this.generatePlusCode(lat, lng)
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

  private generatePlusCode(lat: number, lng: number): string {
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
    const currentProvider = this.mapService.getCurrentProviderType();

    // Si on utilise Mapbox ou si la clé Google est invalide
    if (currentProvider === MapProviderType.MAPBOX ||
      (this.googleKeyChecked && !this.isGoogleKeyValid.getValue())) {
      // Pour Mapbox, nous utilisons l'endpoint de recherche pour obtenir plus de détails
      return this.getMapboxPlaceDetails(placeId);
    } else {
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
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,photos,rating',
      key: this.googleApiKey
    };

    return this.http.get<any>(this.placeDetailsApiUrl, { params }).pipe(
      map(response => {
        if (response.result) {
          const place = response.result;
          return {
            id: placeId,
            name: place.name,
            lat: 0, // Ces valeurs seront remplacées par les coordonnées du marqueur
            lng: 0,
            type: '',
            rating: place.rating,
            address: place.formatted_address,
            phone: place.formatted_phone_number,
            website: place.website,
            openingHours: place.opening_hours?.weekday_text || [],
            photos: place.photos?.map((photo: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.googleApiKey}`
            ) || []
          };
        }
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

    // Mapbox n'a pas d'API de détails équivalente à Google Places
    // On pourrait utiliser d'autres APIs pour compléter l'information
    return of({
      id: featureId,
      name: 'Lieu',
      lat: 0,
      lng: 0,
      type: 'default',
      address: 'Information non disponible',
      plusCode: ''
    } as Place);
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
}
