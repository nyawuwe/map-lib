import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { Map as LeafletMap } from 'leaflet';

@Component({
    selector: 'lib-map-controls',
    templateUrl: './map-controls.component.html',
    styleUrls: ['./map-controls.component.css'],
    standalone: true,
    imports: [CommonModule]
})
export class MapControlsComponent implements OnInit, OnDestroy {
    @Input() map!: LeafletMap;
    @Output() locate = new EventEmitter<boolean>();
    @Output() locationFound = new EventEmitter<L.LocationEvent>();
    @Output() locationError = new EventEmitter<L.ErrorEvent>();

    private mapReadySubscription: Subscription | null = null;
    private locationMarker: L.Marker | null = null;
    private locationCircle: L.Circle | null = null;
    isLocating = false;
    isSatelliteView = false;

    constructor(private mapService: MapService) { }

    ngOnInit(): void {
        this.mapReadySubscription = this.mapService.mapReady$.subscribe(ready => {
            if (ready && !this.map) {
                this.map = this.mapService.getMap() as LeafletMap;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.mapReadySubscription) {
            this.mapReadySubscription.unsubscribe();
        }
    }

    zoomIn(): void {
        if (this.map) {
            this.map.zoomIn();
        }
    }

    zoomOut(): void {
        if (this.map) {
            this.map.zoomOut();
        }
    }

    toggleViewType(): void {
        if (!this.map) return;

        this.isSatelliteView = !this.isSatelliteView;

        // Supprimer toutes les couches de tuiles existantes
        this.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });

        // Ajouter la nouvelle couche de tuiles
        if (this.isSatelliteView) {
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            }).addTo(this.map);
        } else {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
        }
    }

    locateUser(): void {
        this.isLocating = !this.isLocating;
        this.locate.emit(this.isLocating);

        if (this.isLocating) {
            this.map.locate({
                watch: true,
                setView: true,
                maxZoom: 16,
                enableHighAccuracy: true,
                timeout: 30000
            });

            // Listener pour la localisation trouvée
            this.map.on('locationfound', this.onLocationFound.bind(this));

            // Listener pour les erreurs de localisation
            this.map.on('locationerror', this.onLocationError.bind(this));
        } else if (this.locationMarker && this.map) {
            this.map.removeLayer(this.locationMarker);
            this.locationMarker = null;

            if (this.locationCircle) {
                this.map.removeLayer(this.locationCircle);
                this.locationCircle = null;
            }
        } else {
            this.map.stopLocate();
            this.map.off('locationfound');
            this.map.off('locationerror');
        }
    }

    private onLocationFound(e: L.LocationEvent): void {
        if (!this.map) return;

        const radius = Math.round(e.accuracy);

        // Supprimer les marqueurs précédents s'ils existent
        if (this.locationMarker) {
            this.map.removeLayer(this.locationMarker);
        }

        if (this.locationCircle) {
            this.map.removeLayer(this.locationCircle);
        }

        // Créer le marker pour la position actuelle
        this.locationMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div class="location-marker-inner"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        // Créer le cercle pour l'exactitude
        this.locationCircle = L.circle(e.latlng, {
            radius: radius,
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.15,
            weight: 2
        }).addTo(this.map);

        // Créer une couche pour la localisation
        const locationLayer = L.layerGroup([this.locationMarker, this.locationCircle]);

        // Ajouter la couche à notre gestionnaire de couches
        this.mapService.addLayer({
            id: 'user-location',
            name: 'Ma position',
            layer: locationLayer,
            enabled: true,
            zIndex: 100
        });

        // Émettre l'événement de localisation trouvée
        this.locationFound.emit(e);
    }

    private onLocationError(e: L.ErrorEvent): void {
        console.error('Erreur de localisation:', e.message);
        this.isLocating = false;

        // Émettre l'événement d'erreur
        this.locationError.emit(e);

        let message = "Impossible de déterminer votre position: ";
        switch (e.code) {
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
                message += e.message;
        }
        alert(message);
    }
}
