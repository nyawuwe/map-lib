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

    private mapReadySubscription: Subscription | null = null;
    private locationMarker: L.Marker | null = null;
    private locationCircle: L.Circle | null = null;
    isLocating = false;

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

    locateUser(): void {
        this.isLocating = !this.isLocating;
        this.locate.emit(this.isLocating);

        if (this.isLocating) {
            this.map.locate({
                watch: true,
                setView: true,
                maxZoom: 16,
                enableHighAccuracy: true
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
    }

    private onLocationError(e: L.ErrorEvent): void {
        console.error('Erreur de localisation:', e.message);
        this.isLocating = false;

        // Afficher une notification ou un message d'erreur ici si nécessaire
        alert(`Impossible de déterminer votre position: ${e.message}`);
    }
}
