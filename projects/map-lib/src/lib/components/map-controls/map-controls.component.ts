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
  private mapProviderChangeSubscription: Subscription | null = null;
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
      if (ready) {
        const mapInstance = this.mapService.getMap();
        if (mapInstance) {
          this.map = mapInstance;
          this.providerType = this.mapService.getCurrentProviderType();

          if (this.isLocating) {
            this.cleanupLocationResources();
            this.startGeolocation();
          }
        }
      }
    });

    document.addEventListener('map-provider-change', this.handleProviderChange);
  }

  private handleProviderChange = (event: any) => {
    if (event.detail && typeof event.detail.providerType !== 'undefined') {
      setTimeout(() => {
        const mapInstance = this.mapService.getMap();
        if (mapInstance) {
          this.map = mapInstance;
          this.providerType = this.mapService.getCurrentProviderType();

          this.resetViewTypeForProvider();

          if (this.isLocating) {
            this.cleanupLocationResources();
            this.startGeolocation();
          }
        }
      }, 500);
    }
  };

  ngOnDestroy(): void {
    if (this.mapReadySubscription) {
      this.mapReadySubscription.unsubscribe();
    }

    document.removeEventListener('map-provider-change', this.handleProviderChange);

    this.cleanupLocationResources();
  }

  private cleanupLocationResources(): void {
    if (this.geolocationWatchId) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }

    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      (this.map as LeafletMap).stopLocate();

      // Émettre un événement personnalisé pour indiquer l'arrêt de la localisation
      const locationStoppedEvent = new CustomEvent('location-stopped');
      document.dispatchEvent(locationStoppedEvent);

      if (this.locationMarker) {
        (this.locationMarker as L.Marker).remove();
        this.locationMarker = null;
      }

      if (this.locationCircle) {
        this.locationCircle.remove();
        this.locationCircle = null;
      }

      (this.map as LeafletMap).off('locationfound');
      (this.map as LeafletMap).off('locationerror');
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
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
    if (!this.map) return;

    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      (this.map as LeafletMap).zoomIn();
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
      (this.map as mapboxgl.Map).zoomIn();
    }
  }

  zoomOut(): void {
    if (!this.map) return;

    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      (this.map as LeafletMap).zoomOut();
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
      (this.map as mapboxgl.Map).zoomOut();
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

    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      this.toggleLeafletViewType();
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
      this.toggleMapboxViewType();
    }
  }

  private toggleLeafletViewType(): void {
    if (!(this.map instanceof L.Map)) return;

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
    if (!(this.map instanceof mapboxgl.Map)) return;

    const mapboxMap = this.map as mapboxgl.Map;


    const mapboxStyles = {
      [MapViewType.DEFAULT]: 'mapbox://styles/mapbox/standard',
      [MapViewType.SATELLITE]: 'mapbox://styles/mapbox/satellite-v9',
      [MapViewType.GOOGLE]: 'mapbox://styles/mapbox/navigation-day-v1'
    };

    const styleUrl = mapboxStyles[this.currentViewType];

    // Sauvegarder le centre et le zoom actuels
    const currentCenter = mapboxMap.getCenter();
    const currentZoom = mapboxMap.getZoom();

    // Sauvegarder l'état du marqueur de localisation
    const isLocating = this.isLocating;

    // Appliquer le nouveau style
    mapboxMap.setStyle(styleUrl);

    // Après le chargement du style, restaurer la position et le zoom
    mapboxMap.once('style.load', () => {
      // Restaurer le centre et le zoom
      mapboxMap.setCenter(currentCenter);
      mapboxMap.setZoom(currentZoom);

      // Redémarrer la localisation si elle était active
      if (isLocating && !this.locationMarker) {
        // Attendre un court instant pour que la carte soit complètement chargée
        setTimeout(() => {
          this.startMapboxGeolocation();
        }, 200);
      }

      console.log(`Type de vue Mapbox changé pour: ${this.currentViewType}`);
    });
  }

  // Ajouter une méthode pour mettre à jour le type de vue après un changement de fournisseur
  private resetViewTypeForProvider(): void {
    // Réinitialiser à la vue par défaut
    this.currentViewType = MapViewType.DEFAULT;

    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      this.toggleLeafletViewType();
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
      this.toggleMapboxViewType();
    }

    console.log(`Type de vue réinitialisé à DEFAULT pour le fournisseur: ${this.providerType}`);
  }

  locateUser(): void {
    this.isLocating = !this.isLocating;
    this.locate.emit(this.isLocating);

    this.cleanupLocationResources();

    if (this.isLocating) {
      this.startGeolocation();
    }
  }

  private startGeolocation(): void {
    if (!this.map) {
      console.error('La carte n\'est pas initialisée');
      this.isLocating = false;
      return;
    }

    if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
      this.startLeafletGeolocation();
    } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
      this.startMapboxGeolocation();
    } else {
      // Utiliser l'API de géolocalisation du navigateur comme fallback
      this.startBrowserGeolocation();
    }
  }

  private startLeafletGeolocation(): void {
    if (!(this.map instanceof L.Map)) return;

    const leafletMap = this.map as LeafletMap;

    try {
      leafletMap.locate({
        watch: true,
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        timeout: 10000
      });

      leafletMap.off('locationfound');
      leafletMap.off('locationerror');

      leafletMap.on('locationfound', (e: L.LocationEvent) => {
        console.log('Position trouvée (Leaflet):', e.latlng);

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

        this.locationFirstFound = true;

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

  private startMapboxGeolocation(): void {
    if (!(this.map instanceof mapboxgl.Map)) return;

    const mapboxMap = this.map as mapboxgl.Map;

    try {
      // Vérifier si la carte est complètement chargée
      if (!mapboxMap.loaded()) {
        console.log('Carte Mapbox non encore chargée, attente...');
        // Attendre que la carte soit chargée avant d'ajouter le contrôle
        const waitForMapLoad = () => {
          setTimeout(() => {
            if (mapboxMap.loaded()) {
              this.initMapboxGeolocateControl(mapboxMap);
            } else if (this.isLocating) {
              waitForMapLoad();
            }
          }, 200);
        };
        waitForMapLoad();
        return;
      }

      this.initMapboxGeolocateControl(mapboxMap);
    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la localisation Mapbox:', err);
      this.isLocating = false;
      this.showLocationError(0, 'Erreur lors de l\'initialisation de la localisation');

      // Fallback sur la géolocalisation du navigateur
      this.startBrowserGeolocation();
    }
  }

  /**
   * Initialise le contrôle de géolocalisation Mapbox
   */
  private initMapboxGeolocateControl(mapboxMap: mapboxgl.Map): void {
    // Supprimer d'abord tout contrôle existant
    if (this.geolocateControl) {
      try {
        mapboxMap.removeControl(this.geolocateControl);
      } catch (error) {
        console.warn('Impossible de supprimer le contrôle précédent:', error);
      }
      this.geolocateControl = null;
    }

    // Créer un nouveau contrôle de géolocalisation
    this.geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showAccuracyCircle: false, // Désactiver le cercle natif car nous utilisons notre propre cercle
      showUserLocation: true
    });

    // Ajouter le contrôle à la carte
    mapboxMap.addControl(this.geolocateControl);

    // Écouter les événements du contrôle
    this.geolocateControl.on('geolocate', (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      console.log('Position trouvée (Mapbox):', [lat, lng]);

      // Afficher notre propre cercle d'exactitude
      this.displayLocationOnMapbox(lng, lat, accuracy);

      // Émettre l'événement pour notifier les composants parents
      this.locationFound.emit({
        latlng: [lat, lng],
        accuracy: accuracy
      });
    });

    this.geolocateControl.on('error', (err: any) => {
      console.error('Erreur de localisation Mapbox:', err);
      this.isLocating = false;
      this.locationError.emit(err);

      this.showLocationError(0, err.message || 'Erreur de géolocalisation');

      // Si l'erreur est liée aux permissions ou à la disponibilité, essayer la méthode de fallback
      if (err.code === 1 || err.code === 2) {
        this.startBrowserGeolocation();
      }
    });

    // Écouter les changements de style de carte
    mapboxMap.on('style.load', () => {
      if (this.isLocating && this.geolocateControl) {
        console.log('Style de carte changé, réactivation de la géolocalisation...');
        setTimeout(() => {
          if (this.geolocateControl) {
            try {
              this.geolocateControl.trigger();
            } catch (error) {
              console.warn('Erreur lors de la réactivation de la géolocalisation après changement de style:', error);
            }
          }
        }, 300);
      }
    });

    // Déclencher la géolocalisation
    setTimeout(() => {
      if (this.geolocateControl && this.isLocating) {
        try {
          this.geolocateControl.trigger();
        } catch (error) {
          console.error('Erreur lors du déclenchement de la géolocalisation Mapbox:', error);
          this.startBrowserGeolocation();
        }
      }
    }, 500);
  }

  private startBrowserGeolocation(): void {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      this.isLocating = false;
      return;
    }

    const mapElement = this.map instanceof L.Map
      ? (this.map as LeafletMap).getContainer()
      : (this.map as mapboxgl.Map).getContainer();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'location-loading-indicator';
    loadingDiv.innerHTML = '<div class="spinner"></div>';
    mapElement.appendChild(loadingDiv);

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

      console.log(`Position trouvée (navigateur): ${latitude}, ${longitude}`);

      // Centrer la carte sur la position dès la première localisation
      const shouldCenterMap = !this.locationFirstFound;

      if (this.providerType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
        this.displayLocationOnLeaflet(latitude, longitude, accuracy);
        if (shouldCenterMap) {
          (this.map as LeafletMap).setView([latitude, longitude], 16);
        }
      } else if (this.providerType === MapProviderType.MAPBOX && this.map instanceof mapboxgl.Map) {
        this.displayLocationOnMapbox(longitude, latitude, accuracy);
        if (shouldCenterMap) {
          (this.map as mapboxgl.Map).flyTo({
            center: [longitude, latitude],
            zoom: 16
          });
        }
      }

      // Marquer comme trouvé après le premier centrage
      this.locationFirstFound = true;

      // Émettre l'événement pour les composants parents
      this.locationFound.emit({
        latlng: this.providerType === MapProviderType.LEAFLET ? L.latLng(latitude, longitude) : [latitude, longitude],
        accuracy: accuracy
      });
    };

    const onError = (error: GeolocationPositionError) => {
      document.querySelector('.location-loading-indicator')?.remove();
      console.error('Erreur de géolocalisation du navigateur:', error.message);
      this.isLocating = false;

      this.locationError.emit(error);
      this.showLocationError(error.code, error.message);
    };

    // Utiliser watchPosition au lieu de getCurrentPosition pour suivre les changements de position
    this.geolocationWatchId = navigator.geolocation.watchPosition(onSuccess, onError, geoOptions);
  }

  private displayLocationOnLeaflet(latitude: number, longitude: number, accuracy: number): void {
    if (!(this.map instanceof L.Map)) return;

    const leafletMap = this.map as LeafletMap;
    const latlng = L.latLng(latitude, longitude);

    if (this.locationMarker) {
      (this.locationMarker as L.Marker).remove();
    }

    // Créer le marqueur de localisation (point bleu central)
    this.locationMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div class="location-marker-inner"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
    }).addTo(leafletMap);

    // Supprimer l'ancien cercle s'il existe
    if (this.locationCircle) {
      this.locationCircle.remove();
      this.locationCircle = null;
    }

    // Supprimer d'anciens cercles personnalisés s'ils existent
    leafletMap.eachLayer((layer) => {
      // Vérifier si c'est un circleMarker avec une classe spécifique
      if (layer instanceof L.CircleMarker && layer.options &&
        ((layer as any).options.className === 'leaflet-pulsing-circle' ||
          (layer as any).options.className === 'leaflet-location-static-circle')) {
        leafletMap.removeLayer(layer);
      }
    });

    // Cercle de précision avec effet de pulsation
    const pulsingCircleOptions: L.CircleMarkerOptions & { className?: string } = {
      radius: accuracy / 20, // Ajuster en fonction du zoom
      className: 'leaflet-pulsing-circle',
      fillColor: 'transparent',
      fillOpacity: 0,
      stroke: false,
      interactive: false
    };

    const accuracyCircle = L.circleMarker(latlng, pulsingCircleOptions).addTo(leafletMap);

    // Petit cercle statique (rayon fixe de 5m à 10m)
    const smallRadius = Math.min(10, accuracy / 10); // Entre 5m et 10m

    const staticCircleOptions: L.CircleMarkerOptions & { className?: string } = {
      radius: smallRadius / 2, // Convertir en pixels raisonnables
      className: 'leaflet-location-static-circle',
      fillColor: '#2196F3',
      fillOpacity: 0.4,
      stroke: true,
      color: '#2196F3',
      weight: 1,
      interactive: false
    };

    const staticCircle = L.circleMarker(latlng, staticCircleOptions).addTo(leafletMap);

    // Stocker le cercle principal comme référence (attention: c'est maintenant un CircleMarker et non un Circle)
    this.locationCircle = accuracyCircle as any;

    // Ajuster les cercles lors du zoom
    const updateCirclesOnZoom = () => {
      const zoom = leafletMap.getZoom();
      // Formule pour ajuster le rayon en fonction du zoom
      // Plus le zoom est élevé, plus le cercle sera grand en pixels
      const zoomFactor = Math.pow(2, (zoom - 14) / 2); // 14 est un zoom de référence

      // Ajuster le cercle de pulsation
      const pulseRadius = (accuracy / 20) * zoomFactor;
      accuracyCircle.setRadius(Math.min(pulseRadius, 100)); // Limiter la taille

      // Ajuster le petit cercle statique
      const staticRadius = (smallRadius / 2) * zoomFactor;
      staticCircle.setRadius(Math.min(staticRadius, 20)); // Limiter la taille
    };

    // Appliquer l'ajustement initial
    updateCirclesOnZoom();

    // S'abonner à l'événement de zoom pour mettre à jour les cercles
    leafletMap.off('zoomend', updateCirclesOnZoom);
    leafletMap.on('zoomend', updateCirclesOnZoom);
  }

  private displayLocationOnMapbox(longitude: number, latitude: number, accuracy: number): void {
    if (!(this.map instanceof mapboxgl.Map)) return;

    const mapboxMap = this.map as mapboxgl.Map;

    if (this.locationMarker) {
      (this.locationMarker as mapboxgl.Marker).remove();
    }

    // Créer le point de localisation (marker bleu central)
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = '<div class="location-marker-inner"></div>';

    this.locationMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(mapboxMap);

    // Convertir le rayon en mètres vers des pixels
    const zoomLevel = mapboxMap.getZoom();
    const pulseRadiusPixels = this.metersToPixelsAtLatitude(accuracy, latitude, zoomLevel);
    const staticRadiusPixels = this.metersToPixelsAtLatitude(
      Math.min(10, accuracy / 10), // Rayon du petit cercle statique (5-10m)
      latitude,
      zoomLevel
    );

    // Créer un GeoJSON pour les deux cercles
    const circlesGeoJson = {
      type: 'FeatureCollection',
      features: [
        // Cercle de pulsation
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          properties: {
            radius_meters: accuracy,
            radius_pixels: pulseRadiusPixels,
            circleType: 'pulse'
          }
        },
        // Petit cercle statique
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          properties: {
            radius_meters: Math.min(10, accuracy / 10),
            radius_pixels: staticRadiusPixels,
            circleType: 'static'
          }
        }
      ]
    };

    // Supprimer les sources et couches existantes si elles existent
    this.removeMapboxLocationLayers(mapboxMap);

    // Ajouter la source de données pour les cercles
    mapboxMap.addSource(this.locationGeoJSONSource, {
      type: 'geojson',
      data: circlesGeoJson as any
    });

    // Ajouter la couche pour le cercle de pulsation
    mapboxMap.addLayer({
      id: 'location-pulse-circle',
      source: this.locationGeoJSONSource,
      type: 'circle',
      filter: ['==', ['get', 'circleType'], 'pulse'],
      paint: {
        'circle-radius': ['get', 'radius_pixels'],
        'circle-color': '#2196F3',
        'circle-opacity': 0.2,
        'circle-opacity-transition': {
          duration: 2000,
          delay: 0
        },
        'circle-stroke-width': 1,
        'circle-stroke-color': '#2196F3',
        'circle-stroke-opacity': 0.3,
        'circle-radius-transition': {
          duration: 2000,
          delay: 0
        }
      }
    });

    // Ajouter la couche pour le petit cercle statique
    mapboxMap.addLayer({
      id: 'location-static-circle',
      source: this.locationGeoJSONSource,
      type: 'circle',
      filter: ['==', ['get', 'circleType'], 'static'],
      paint: {
        'circle-radius': ['get', 'radius_pixels'],
        'circle-color': '#2196F3',
        'circle-opacity': 0.4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#2196F3',
        'circle-stroke-opacity': 0.6
      }
    });

    // Animation du cercle de pulsation
    this.animateMapboxPulseCircle(mapboxMap, circlesGeoJson);

    // Mettre à jour les rayons lors du zoom
    mapboxMap.on('zoom', () => {
      if (this.isLocating && this.locationMarker) {
        const position = (this.locationMarker as mapboxgl.Marker).getLngLat();
        const newZoom = mapboxMap.getZoom();

        // Mettre à jour les rayons en fonction du nouveau zoom
        const newPulsePixels = this.metersToPixelsAtLatitude(
          circlesGeoJson.features[0].properties.radius_meters,
          position.lat,
          newZoom
        );

        const newStaticPixels = this.metersToPixelsAtLatitude(
          circlesGeoJson.features[1].properties.radius_meters,
          position.lat,
          newZoom
        );

        // Mettre à jour les propriétés
        circlesGeoJson.features[0].properties.radius_pixels = newPulsePixels;
        circlesGeoJson.features[1].properties.radius_pixels = newStaticPixels;

        // Mettre à jour la source
        if (mapboxMap.getSource(this.locationGeoJSONSource)) {
          (mapboxMap.getSource(this.locationGeoJSONSource) as mapboxgl.GeoJSONSource)
            .setData(circlesGeoJson as any);
        }
      }
    });
  }

  /**
   * Supprime les couches et sources liées à la localisation dans Mapbox
   */
  private removeMapboxLocationLayers(mapboxMap: mapboxgl.Map): void {
    const layers = ['location-pulse-circle', 'location-static-circle', 'accuracy-circle-layer'];

    layers.forEach(layer => {
      if (mapboxMap.getLayer(layer)) {
        mapboxMap.removeLayer(layer);
      }
    });

    if (mapboxMap.getSource(this.locationGeoJSONSource)) {
      mapboxMap.removeSource(this.locationGeoJSONSource);
    }
  }

  /**
   * Anime le cercle de pulsation avec Mapbox
   */
  private animateMapboxPulseCircle(mapboxMap: mapboxgl.Map, geoJson: any): void {
    // Cycle d'animation
    const animatePulse = () => {
      // Stopper l'animation si on n'est plus en mode de localisation
      if (!this.isLocating) return;

      setTimeout(() => {
        // Agrandir le cercle et réduire l'opacité
        mapboxMap.setPaintProperty('location-pulse-circle', 'circle-radius',
          ['*', ['get', 'radius_pixels'], 1.6]);
        mapboxMap.setPaintProperty('location-pulse-circle', 'circle-opacity', 0);
        mapboxMap.setPaintProperty('location-pulse-circle', 'circle-stroke-opacity', 0);

        setTimeout(() => {
          // Réinitialiser pour recommencer l'animation
          mapboxMap.setPaintProperty('location-pulse-circle', 'circle-radius',
            ['get', 'radius_pixels']);
          mapboxMap.setPaintProperty('location-pulse-circle', 'circle-opacity', 0.2);
          mapboxMap.setPaintProperty('location-pulse-circle', 'circle-stroke-opacity', 0.3);

          // Continuer l'animation
          requestAnimationFrame(() => {
            if (this.isLocating) {
              animatePulse();
            }
          });
        }, 2000); // Durée pour réinitialiser
      }, 100); // Délai pour commencer la transition
    };

    // Démarrer l'animation
    animatePulse();
  }

  /**
   * Convertit une distance en mètres en pixels à une latitude et un niveau de zoom donnés
   * @param meters Distance en mètres
   * @param latitude Latitude où mesurer
   * @param zoom Niveau de zoom actuel
   * @returns Rayon en pixels
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
    // Pour éviter des cercles trop grands, on limite à 50 pixels maximum
    const pixelRadius = Math.min(
      meters / (meterPerPixelAtZoom0 / zoomScale) / latitudeAdjustment,
      50
    );

    return pixelRadius;
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
}
