import { Injectable, InjectionToken, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as L from 'leaflet';
import { IconService } from './icon.service';
import { PopupService } from './popup.service';
import { PopupInfo } from '../models/popup-info.model';

export const GOOGLE_PLACES_API_KEY = new InjectionToken<string>('GOOGLE_PLACES_API_KEY');

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

  constructor(
    private http: HttpClient,
    private iconService: IconService,
    private popupService: PopupService,
    @Inject(GOOGLE_PLACES_API_KEY) private apiKey: string
  ) { }

  /**
   * Récupère les points d'intérêt autour d'un emplacement
   */
  getNearbyPlaces(lat: number, lng: number, radius: number = 1000, type: string = ''): Observable<Place[]> {
    const params = {
      location: `${lat},${lng}`,
      radius: radius.toString(),
      type: type,
      key: this.apiKey
    };

    return this.http.get<any>(this.placesApiUrl, { params }).pipe(
      map(response => {
        if (response.status === 'REQUEST_DENIED' || !response.results || response.results.length === 0) {
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
        console.error('Erreur lors de la récupération des points d\'intérêt:', error);
        // Fallback en cas d'erreur
        return of([this.createFallbackPlace(lat, lng, type)]);
      })
    );
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
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,photos,rating',
      key: this.apiKey
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
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
            ) || []
          };
        }
        return {} as Place;
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des détails du point d\'intérêt:', error);
        return of({} as Place);
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
}
