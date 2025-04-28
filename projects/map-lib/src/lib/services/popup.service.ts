import { Injectable, Injector, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { PopupComponent } from '../components/popup/popup.component';
import { PopupInfo } from '../models/popup-info.model';
import * as L from 'leaflet';

@Injectable({
    providedIn: 'root'
})
export class PopupService {

    constructor(
        private injector: Injector,
        private applicationRef: ApplicationRef,
        private environmentInjector: EnvironmentInjector
    ) { }

    /**
     * Crée un popup Leaflet avec une apparence Card moderne
     */
    createPopup(popupInfo: PopupInfo, latLng?: L.LatLng, options?: L.PopupOptions): L.Popup {
        // Configuration par défaut du popup Leaflet
        const defaultOptions: L.PopupOptions = {
            className: 'custom-popup',
            minWidth: 280,
            maxWidth: 320,
            closeButton: true,
            closeOnClick: false,
            autoPan: true,
            autoPanPadding: [50, 50],
            offset: [0, -10],
            // Options pour un rendu plus fluide
            keepInView: true,
            autoClose: false,
            closeOnEscapeKey: true,
            interactive: true
        };

        const mergedOptions = { ...defaultOptions, ...options };

        // Créer un élément div pour contenir notre composant Angular
        const container = document.createElement('div');

        // Créer une instance du composant PopupComponent
        const componentRef = createComponent(PopupComponent, {
            environmentInjector: this.environmentInjector,
            hostElement: container,
            elementInjector: this.injector
        });

        // Passer les informations au composant
        componentRef.instance.popupInfo = popupInfo;
        if (latLng) {
            componentRef.instance.latitude = latLng.lat;
            componentRef.instance.longitude = latLng.lng;
        }

        // Attacher le composant à l'application
        this.applicationRef.attachView(componentRef.hostView);

        // Créer le popup et définir son contenu avec notre élément
        const popup = L.popup(mergedOptions).setContent(container);

        // Détacher la vue du composant lorsque le popup est fermé
        popup.on('remove', () => {
            this.applicationRef.detachView(componentRef.hostView);
            componentRef.destroy();
        });

        return popup;
    }

    /**
     * Ajoute un popup à un marqueur existant
     */
    bindPopupToMarker(marker: L.Marker, popupInfo: PopupInfo, options?: L.PopupOptions): L.Marker {
        const popup = this.createPopup(popupInfo, marker.getLatLng(), options);

        // Configurer le popup avec des options avancées
        marker.bindPopup(popup);

        // Ajouter un effet de clic au marqueur
        marker.on('click', function (this: L.Marker) {
            this.openPopup();
        });

        return marker;
    }
}
