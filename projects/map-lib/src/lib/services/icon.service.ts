import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { PopupInfo } from '../models/popup-info.model';
import { PopupService } from './popup.service';

export interface IconOptions {
  iconClass?: string;
  iconColor?: string;
  markerColor?: string;
  iconSize?: L.PointExpression;
  iconAnchor?: L.PointExpression;
  popupAnchor?: L.PointExpression;
  shadowUrl?: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IconService {

  constructor(private popupService: PopupService) { }

  /**
   * Crée une icône Leaflet basée sur une icône Font Awesome
   */
  createFontAwesomeIcon(options: IconOptions): L.DivIcon {
    const defaults = {
      iconColor: 'white',
      markerColor: '#3388ff',
      iconSize: [25, 41] as L.PointExpression,
      iconAnchor: [12, 41] as L.PointExpression,
      popupAnchor: [1, -34] as L.PointExpression
    };

    const opts = { ...defaults, ...options };

    if (opts.imageUrl) {
      return L.divIcon({
        html: `
          <div class="custom-div-icon">
            <div id="leaflet-marker-pane custom-div-icon" class="marker-pin" style="background-color: ${opts.markerColor}; width:auto !important;">
              <img src="${opts.imageUrl}">
            </div>
          </div>
        `,
        iconSize: opts.iconSize,
        iconAnchor: opts.iconAnchor,
        popupAnchor: opts.popupAnchor,
        className: 'custom-div-icon'
      });
    }

    return L.divIcon({
      html: `
        <div class="custom-div-icon">
          <div class="marker-pin" style="background-color: ${opts.markerColor};">
            <i class="${opts.iconClass}" style="color: ${opts.iconColor};"></i>
          </div>
        </div>
      `,
      iconSize: opts.iconSize,
      iconAnchor: opts.iconAnchor,
      popupAnchor: opts.popupAnchor,
      className: 'custom-div-icon'
    });
  }

  /**
   * Crée une icône Leaflet basée sur une image
   */
  createImageIcon(options: IconOptions): L.Icon {
    const defaults = {
      iconSize: [25, 41] as L.PointExpression,
      iconAnchor: [12, 41] as L.PointExpression,
      popupAnchor: [1, -34] as L.PointExpression
    };

    const opts = { ...defaults, ...options };

    if (!opts.imageUrl) {
      throw new Error("L'URL de l'image est requise pour créer une icône d'image");
    }

    return L.icon({
      iconUrl: opts.imageUrl,
      iconSize: opts.iconSize,
      iconAnchor: opts.iconAnchor,
      popupAnchor: opts.popupAnchor,
      shadowUrl: opts.shadowUrl
    });
  }

  /**
   * Crée un marqueur avec une icône Font Awesome ou une image et un popup personnalisé
   */
  createMarkerWithIcon(
    latLng: L.LatLngExpression,
    iconOptions: IconOptions,
    popupInfo?: PopupInfo | string
  ): L.Marker {
    let icon: L.Icon | L.DivIcon;

    if (iconOptions.imageUrl && !iconOptions.iconClass) {
      icon = this.createImageIcon(iconOptions);
    } else {
      if (!iconOptions.iconClass) {
        iconOptions.iconClass = 'fas fa-map-marker';
      }
      icon = this.createFontAwesomeIcon(iconOptions);
    }

    const marker = L.marker(latLng, { icon });

    if (popupInfo) {
      if (typeof popupInfo === 'string') {
        const popupInfoObj: PopupInfo = {
          title: iconOptions.iconClass ? (iconOptions.iconClass.split(' ').pop() || 'Location') : 'Location',
          description: popupInfo
        };
        this.popupService.bindPopupToMarker(marker, popupInfoObj);
      } else {
        this.popupService.bindPopupToMarker(marker, popupInfo);
      }
    }

    return marker;
  }
}
