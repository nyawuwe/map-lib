import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { Map as LeafletMap } from 'leaflet';
import { MapProviderType } from '../../models/map-provider.model';
import mapboxgl from 'mapbox-gl';

// Définir les types de vue disponibles
export enum MapViewType {
    DEFAULT = 'default',
    SATELLITE = 'satellite',
    GOOGLE = 'google'
}

// Interface pour unifier les événements de localisation
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

    isLocating = false;
    currentViewType: MapViewType = MapViewType.DEFAULT;

    // URLs des différentes couches de tuiles
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

        // Nettoyer les ressources de localisation
        this.cleanupLocationResources();
    }

    private cleanupLocationResources(): void {
        if (this.providerType === MapProviderType.LEAFLET) {
            const leafletMap = this.map as LeafletMap;
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

            // Supprimer les sources et couches GeoJSON de précision
            if (mapboxMap.getLayer('accuracy-circle-layer')) {
                mapboxMap.removeLayer('accuracy-circle-layer');
            }

            if (mapboxMap.getSource(this.locationGeoJSONSource)) {
                mapboxMap.removeSource(this.locationGeoJSONSource);
            }
        }
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

        // Passer au type de vue suivant
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

        // Supprimer toutes les couches de tuiles existantes
        leafletMap.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                leafletMap.removeLayer(layer);
            }
        });

        // Ajouter la nouvelle couche de tuiles
        const tileLayer = this.tileLayers[this.currentViewType];
        L.tileLayer(tileLayer.url, {
            attribution: tileLayer.attribution
        }).addTo(leafletMap);
    }

    private toggleMapboxViewType(): void {
        const mapboxMap = this.map as mapboxgl.Map;

        // Changer le style de la carte Mapbox
        let styleUrl = 'mapbox://styles/mapbox/streets-v11'; // DEFAULT

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

        // Nettoyer les ressources de localisation précédentes
        this.cleanupLocationResources();

        if (this.isLocating) {
            if (this.providerType === MapProviderType.LEAFLET) {
                this.startLeafletLocation();
            } else if (this.providerType === MapProviderType.MAPBOX) {
                const mapboxMap = this.map as mapboxgl.Map;

                // Vérifier si la carte Mapbox est complètement chargée
                if (mapboxMap.loaded()) {
                    this.startMapboxLocation();
                } else {
                    // Attendre que la carte soit chargée avant d'initialiser la localisation
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

    private startLeafletLocation(): void {
        const leafletMap = this.map as LeafletMap;

        try {
            // Vérifier que la carte est bien initialisée et prête
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

            // Listener pour la localisation trouvée
            leafletMap.on('locationfound', this.onLeafletLocationFound.bind(this));

            // Listener pour les erreurs de localisation
            leafletMap.on('locationerror', this.onLeafletLocationError.bind(this));
        } catch (err) {
            console.error('Erreur lors de l\'initialisation de la localisation Leaflet:', err);
            this.isLocating = false;
            this.showLocationError(0, 'Erreur lors de l\'initialisation de la localisation');
        }
    }

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

        // Événement de localisation trouvée
        this.geolocateControl.on('geolocate', (e: any) => {
            this.onMapboxLocationFound(e);
        });

        // Événement d'erreur
        this.geolocateControl.on('error', (e: any) => {
            this.onMapboxLocationError(e);
        });

        // Déclencher la localisation après un court délai pour s'assurer que le contrôle est bien initialisé
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

    private onLeafletLocationFound(e: L.LocationEvent): void {
        if (!this.map) return;
        const leafletMap = this.map as LeafletMap;

        const radius = Math.round(e.accuracy);

        // Supprimer les marqueurs précédents s'ils existent
        if (this.locationMarker) {
            leafletMap.removeLayer(this.locationMarker as L.Marker);
        }

        if (this.locationCircle) {
            leafletMap.removeLayer(this.locationCircle);
        }

        // Créer le marker pour la position actuelle
        this.locationMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div class="location-marker-inner"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(leafletMap);

        // Créer le cercle pour l'exactitude
        this.locationCircle = L.circle(e.latlng, {
            radius: radius,
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.15,
            weight: 2
        }).addTo(leafletMap);

        // Créer une couche pour la localisation
        const locationLayer = L.layerGroup([this.locationMarker as L.Marker, this.locationCircle]);

        // Ajouter la couche à notre gestionnaire de couches
        this.mapService.addLayer({
            id: 'user-location',
            name: 'Ma position',
            layer: locationLayer,
            enabled: true,
            zIndex: 100
        });

        // Émettre l'événement de localisation trouvée
        this.locationFound.emit({
            latlng: e.latlng,
            accuracy: e.accuracy
        });
    }

    private onMapboxLocationFound(e: any): void {
        if (!this.map) return;
        const mapboxMap = this.map as mapboxgl.Map;

        const coords = [e.coords.longitude, e.coords.latitude];
        const accuracy = e.coords.accuracy;

        // Créer un marqueur pour la position
        if (this.locationMarker) {
            (this.locationMarker as mapboxgl.Marker).remove();
        }

        this.locationMarker = new mapboxgl.Marker({
            element: this.createLocationMarkerElement()
        })
            .setLngLat(coords as [number, number])
            .addTo(mapboxMap);

        // Mettre à jour la source GeoJSON pour le cercle de précision
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

        // Mettre à jour la source
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

        // Émettre l'événement de localisation trouvée
        this.locationFound.emit({
            latlng: [e.coords.latitude, e.coords.longitude],
            accuracy: e.coords.accuracy
        });
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

        // Émettre l'événement d'erreur
        this.locationError.emit(e);

        this.showLocationError(e.code, e.message);
    }

    private onMapboxLocationError(e: any): void {
        console.error('Erreur de localisation Mapbox:', e);
        this.isLocating = false;

        // Émettre l'événement d'erreur
        this.locationError.emit(e);

        // Mapbox ne fournit pas de code d'erreur standard, nous essayons de détecter le type d'erreur
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
