import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { Map as LeafletMap } from 'leaflet';
import { MapProviderType } from '../../models/map-provider.model';
import mapboxgl from 'mapbox-gl';


export enum MapViewType {
  DEFAULT = 'default',
  SATELLITE = 'satellite',
  GOOGLE = 'google'
}

export interface LocationData {
  latlng: L.LatLng | [number, number];
  accuracy: number;
}

@Component({
  selector: 'lib-map-controls',
  templateUrl: './map-controls.component.html',
  styleUrls: ['./map-controls.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MapControlsComponent implements OnInit, OnDestroy {
  @Input() map!: LeafletMap | mapboxgl.Map;
  @Output() locate = new EventEmitter<boolean>();
  @Output() locationFound = new EventEmitter<LocationData>();
  @Output() locationError = new EventEmitter<any>();

  private mapReadySubscription: Subscription | null = null;
  private locationMarker: L.Marker | mapboxgl.Marker | null = null;
  private locationCircle: L.Circle | null = null;
  private locationGeoJSONSource: string = 'user-location-geojson';
  private providerType: MapProviderType = MapProviderType.LEAFLET;
  private geolocateControl: mapboxgl.GeolocateControl | null = null;
  private locationFirstFound: boolean = false;
  private geolocationWatchId: number | null = null;

  isLocating = false;
  currentViewType: MapViewType = MapViewType.DEFAULT;

  private tileLayers = {
    [MapViewType.DEFAULT]: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    [MapViewType.SATELLITE]: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    [MapViewType.GOOGLE]: {
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps'
    }
  };

  constructor(private mapService: MapService) { }

  ngOnInit(): void {
    this.providerType = this.mapService.getCurrentProviderType();

    this.mapReadySubscription = this.mapService.mapReady$.subscribe(ready => {
      if (ready && !this.map) {
        this.map = this.mapService.getMap();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.mapReadySubscription) {
      this.mapReadySubscription.unsubscribe();
    }

    this.cleanupLocationResources();
  }

  private cleanupLocationResources(): void {
    if ((this as any).geolocationWatchId) {
      navigator.geolocation.clearWatch((this as any).geolocationWatchId);
      (this as any).geolocationWatchId = null;
    }

    if (this.providerType === MapProviderType.LEAFLET) {
      const leafletMap = this.map as LeafletMap;

      if (this.locationMarker) {
        (this.locationMarker as L.Marker).remove();
        this.locationMarker = null;
      }

      if (this.locationCircle) {
        this.locationCircle.remove();
        this.locationCircle = null;
      }
    } else if (this.providerType === MapProviderType.MAPBOX) {
      try {
        const mapboxMap = this.map as mapboxgl.Map;

        if (this.geolocateControl) {
          mapboxMap.removeControl(this.geolocateControl);
          this.geolocateControl = null;
        }

        if (this.locationMarker) {
          (this.locationMarker as mapboxgl.Marker).remove();
          this.locationMarker = null;
        }

        if (mapboxMap && mapboxMap.loaded && mapboxMap.loaded()) {
          if (typeof mapboxMap.getLayer === 'function' &&
            typeof mapboxMap.removeLayer === 'function' &&
            mapboxMap.getLayer('accuracy-circle-layer')) {
            mapboxMap.removeLayer('accuracy-circle-layer');
          }

          if (typeof mapboxMap.getSource === 'function' &&
            typeof mapboxMap.removeSource === 'function' &&
            mapboxMap.getSource(this.locationGeoJSONSource)) {
            mapboxMap.removeSource(this.locationGeoJSONSource);
          }
        }
      } catch (error) {
        console.error('Erreur lors du nettoyage des ressources Mapbox:', error);
      }
    }

    document.querySelector('.location-loading-indicator')?.remove();
  }

  zoomIn(): void {
    if (this.map) {
      if (this.providerType === MapProviderType.LEAFLET) {
        (this.map as LeafletMap).zoomIn();
      } else if (this.providerType === MapProviderType.MAPBOX) {
        (this.map as mapboxgl.Map).zoomIn();
      }
    }
  }

  zoomOut(): void {
    if (this.map) {
      if (this.providerType === MapProviderType.LEAFLET) {
        (this.map as LeafletMap).zoomOut();
      } else if (this.providerType === MapProviderType.MAPBOX) {
        (this.map as mapboxgl.Map).zoomOut();
      }
    }
  }

  toggleViewType(): void {
    if (!this.map) return;

    if (this.currentViewType === MapViewType.DEFAULT) {
      this.currentViewType = MapViewType.SATELLITE;
    } else if (this.currentViewType === MapViewType.SATELLITE) {
      this.currentViewType = MapViewType.GOOGLE;
    } else {
      this.currentViewType = MapViewType.DEFAULT;
    }

    if (this.providerType === MapProviderType.LEAFLET) {
      this.toggleLeafletViewType();
    } else if (this.providerType === MapProviderType.MAPBOX) {
      this.toggleMapboxViewType();
    }
  }

  private toggleLeafletViewType(): void {
    const leafletMap = this.map as LeafletMap;

    leafletMap.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        leafletMap.removeLayer(layer);
      }
    });


    const tileLayer = this.tileLayers[this.currentViewType];
    L.tileLayer(tileLayer.url, {
      attribution: tileLayer.attribution
    }).addTo(leafletMap);
  }

  private toggleMapboxViewType(): void {
    const mapboxMap = this.map as mapboxgl.Map;

    let styleUrl = 'mapbox://styles/mapbox/streets-v11';

    if (this.currentViewType === MapViewType.SATELLITE) {
      styleUrl = 'mapbox://styles/mapbox/satellite-v9';
    } else if (this.currentViewType === MapViewType.GOOGLE) {
      styleUrl = 'mapbox://styles/mapbox/navigation-day-v1';
    }

    mapboxMap.setStyle(styleUrl);
  }

  locateUser(): void {
    this.isLocating = !this.isLocating;
    this.locate.emit(this.isLocating);

    this.cleanupLocationResources();

    if (this.isLocating) {
      if (this.providerType === MapProviderType.LEAFLET) {
        this.startLeafletLocation();
      } else {
        this.startUnifiedGeolocation();
      }
    }
  }

  private startUnifiedGeolocation(): void {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      this.isLocating = false;
      return;
    }

    const mapElement = this.providerType === MapProviderType.LEAFLET
      ? (this.map as LeafletMap).getContainer()
      : (this.map as mapboxgl.Map).getContainer();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'location-loading-indicator';
    loadingDiv.innerHTML = '<div class="spinner"></div>';
    mapElement.appendChild(loadingDiv);

    let watchId: number;

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const onSuccess = (position: GeolocationPosition) => {
      document.querySelector('.location-loading-indicator')?.remove();

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      if (this.providerType === MapProviderType.LEAFLET) {
        this.displayLocationOnLeaflet(latitude, longitude, accuracy);
      } else {
        this.displayLocationOnMapbox(longitude, latitude, accuracy);
      }

      if (this.providerType === MapProviderType.LEAFLET) {
        this.locationFound.emit({
          latlng: L.latLng(latitude, longitude),
          accuracy: accuracy
        });
      } else {
        this.locationFound.emit({
          latlng: [latitude, longitude],
          accuracy: accuracy
        });
      }
    };

    const onError = (error: GeolocationPositionError) => {
      document.querySelector('.location-loading-indicator')?.remove();
      console.error('Erreur de géolocalisation:', error);
      this.isLocating = false;
      this.locationError.emit(error);
      this.showLocationError(error.code, error.message);
    };

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, geoOptions);

    (this as any).geolocationWatchId = watchId;
  }

  private displayLocationOnLeaflet(latitude: number, longitude: number, accuracy: number): void {
    const leafletMap = this.map as LeafletMap;
    const latlng = L.latLng(latitude, longitude);

    if (this.locationMarker) {
      (this.locationMarker as L.Marker).remove();
    }

    if (this.locationCircle) {
      this.locationCircle.remove();
    }

    this.locationMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div class="location-marker-inner"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
    }).addTo(leafletMap);

    this.locationCircle = L.circle(latlng, {
      radius: accuracy,
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(leafletMap);

    if (!(this as any).locationFirstFound) {
      leafletMap.setView(latlng, 16);
      (this as any).locationFirstFound = true;
    }
  }

  private displayLocationOnMapbox(longitude: number, latitude: number, accuracy: number): void {
    const mapboxMap = this.map as mapboxgl.Map;

    if (this.locationMarker) {
      (this.locationMarker as mapboxgl.Marker).remove();
    }

    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = '<div class="location-marker-inner"></div>';

    this.locationMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(mapboxMap);

    const circleGeoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        properties: {
          radius: accuracy
        }
      }]
    };

    if (mapboxMap.getSource(this.locationGeoJSONSource)) {
      (mapboxMap.getSource(this.locationGeoJSONSource) as mapboxgl.GeoJSONSource).setData(circleGeoJson as any);
    } else {
      mapboxMap.addSource(this.locationGeoJSONSource, {
        type: 'geojson',
        data: circleGeoJson as any
      });

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

    if (!(this as any).locationFirstFound) {
      mapboxMap.flyTo({
        center: [longitude, latitude],
        zoom: 16
      });
      (this as any).locationFirstFound = true;
    }
  }

  private createLocationMarkerElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'user-location-marker';

    const inner = document.createElement('div');
    inner.className = 'location-marker-inner';
    el.appendChild(inner);

    return el;
  }

  private onLeafletLocationError(e: L.ErrorEvent): void {
    console.error('Erreur de localisation Leaflet:', e.message);
    this.isLocating = false;

    this.locationError.emit(e);

    this.showLocationError(e.code, e.message);
  }

  private onMapboxLocationError(e: any): void {
    console.error('Erreur de localisation Mapbox:', e);
    this.isLocating = false;

    this.locationError.emit(e);

    let errorCode = 0;
    let errorMessage = e.message || 'Erreur inconnue';

    if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
      errorCode = 1;
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('indisponible')) {
      errorCode = 2;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('expir')) {
      errorCode = 3;
    }

    this.showLocationError(errorCode, errorMessage);
  }

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
    alert(message);
  }

  private startLeafletLocation(): void {
    const leafletMap = this.map as LeafletMap;

    try {
      leafletMap.locate({
        watch: true,
        setView: true,
        maxZoom: 15,
        enableHighAccuracy: true,
        timeout: 10000
      });

      leafletMap.off('locationfound');
      leafletMap.off('locationerror');

      leafletMap.on('locationfound', (e: L.LocationEvent) => {
        console.log('Position trouvée:', e.latlng);

        if (this.locationMarker) {
          (this.locationMarker as L.Marker).remove();
        }

        this.locationMarker = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div class="location-marker-inner"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          })
        }).addTo(leafletMap);

        if (this.locationCircle) {
          this.locationCircle.remove();
        }

        this.locationCircle = L.circle(e.latlng, {
          radius: e.accuracy,
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.15,
          weight: 2
        }).addTo(leafletMap);

        this.locationFound.emit({
          latlng: e.latlng,
          accuracy: e.accuracy
        });
      });

      leafletMap.on('locationerror', (e: L.ErrorEvent) => {
        console.error('Erreur de localisation Leaflet:', e.message);
        this.isLocating = false;
        this.locationError.emit(e);
        this.showLocationError(e.code, e.message);
      });

    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la localisation Leaflet:', err);
      this.isLocating = false;
      this.showLocationError(0, 'Erreur lors de l\'initialisation de la localisation');
    }
  }
}
