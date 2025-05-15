import { Injectable, Injector, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { PopupComponent } from '../components/popup/popup.component';
import { ClickedPointPopupComponent, ClickedPointButtonConfig } from '../components/clicked-point-popup/clicked-point-popup.component';
import { PopupInfo } from '../models/popup-info.model';
import * as L from 'leaflet';
import { Observable, Subject } from 'rxjs';

export interface ClickedPointEvent {
    buttonIndex: number;
    latitude: number;
    longitude: number;
}

@Injectable({
    providedIn: 'root'
})
export class PopupService {
    private clickedPointEvents = new Subject<ClickedPointEvent>();

    constructor(
        private injector: Injector,
        private applicationRef: ApplicationRef,
        private environmentInjector: EnvironmentInjector
    ) { }

    /**
     * Obtenir les événements des boutons du ClickedPointPopup
     */
    getClickedPointEvents(): Observable<ClickedPointEvent> {
        return this.clickedPointEvents.asObservable();
    }

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
     * Crée un popup spécifique pour les points cliqués sur la carte
     */
    createClickedPointPopup(lat: number, lng: number, options?: L.PopupOptions,
        buttonConfig?: {
            button1?: ClickedPointButtonConfig,
            button2?: ClickedPointButtonConfig,
            button3?: ClickedPointButtonConfig
        }): L.Popup {
        // Configuration par défaut du popup Leaflet pour les points cliqués
        const defaultOptions: L.PopupOptions = {
            className: 'clicked-point-custom-popup',
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

        // Créer une instance du composant ClickedPointPopupComponent
        const componentRef = createComponent(ClickedPointPopupComponent, {
            environmentInjector: this.environmentInjector,
            hostElement: container,
            elementInjector: this.injector
        });

        // Passer les informations au composant
        componentRef.instance.latitude = lat;
        componentRef.instance.longitude = lng;
        componentRef.instance.locationName = 'Lieu non répertorié';

        // Configurer les boutons si spécifiés
        if (buttonConfig) {
            if (buttonConfig.button1) {
                componentRef.instance.button1Config = { ...componentRef.instance.button1Config, ...buttonConfig.button1 };
            }
            if (buttonConfig.button2) {
                componentRef.instance.button2Config = { ...componentRef.instance.button2Config, ...buttonConfig.button2 };
            }
            if (buttonConfig.button3) {
                componentRef.instance.button3Config = { ...componentRef.instance.button3Config, ...buttonConfig.button3 };
            }
        }

        // Écouter les événements de bouton
        componentRef.instance.button1Click.subscribe(data => {
            this.clickedPointEvents.next({ buttonIndex: 1, latitude: data.lat, longitude: data.lng });
        });
        componentRef.instance.button2Click.subscribe(data => {
            this.clickedPointEvents.next({ buttonIndex: 2, latitude: data.lat, longitude: data.lng });
        });
        componentRef.instance.button3Click.subscribe(data => {
            this.clickedPointEvents.next({ buttonIndex: 3, latitude: data.lat, longitude: data.lng });
        });

        // Attacher le composant à l'application
        this.applicationRef.attachView(componentRef.hostView);

        // Créer le popup et définir son contenu avec notre élément
        const popup = L.popup(mergedOptions).setContent(container);

        // Détacher la vue du composant lorsque le popup est fermé
        popup.on('remove', () => {
            // Désabonnement des événements
            componentRef.instance.button1Click.complete();
            componentRef.instance.button2Click.complete();
            componentRef.instance.button3Click.complete();

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

    /**
     * Ajoute un popup spécifique pour point cliqué à un marqueur existant
     */
    bindClickedPointPopupToMarker(marker: L.Marker, options?: L.PopupOptions, buttonConfig?: {
        button1?: ClickedPointButtonConfig,
        button2?: ClickedPointButtonConfig,
        button3?: ClickedPointButtonConfig
    }): L.Marker {
        const latLng = marker.getLatLng();
        const popup = this.createClickedPointPopup(latLng.lat, latLng.lng, options, buttonConfig);

        // Configurer le popup avec des options avancées
        marker.bindPopup(popup);

        // Ajouter un effet de clic au marqueur
        marker.on('click', function (this: L.Marker) {
            this.openPopup();
        });

        return marker;
    }
}
