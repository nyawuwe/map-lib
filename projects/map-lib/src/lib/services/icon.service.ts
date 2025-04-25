import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface IconOptions {
  iconClass: string;
  iconColor?: string;
  markerColor?: string;
  iconSize?: L.PointExpression;
  iconAnchor?: L.PointExpression;
  popupAnchor?: L.PointExpression;
  shadowUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IconService {

  constructor() { }

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
   * Crée un marqueur avec une icône Font Awesome
   */
  createMarkerWithIcon(latLng: L.LatLngExpression, options: IconOptions, popupContent?: string): L.Marker {
    const icon = this.createFontAwesomeIcon(options);
    const marker = L.marker(latLng, { icon });

    if (popupContent) {
      marker.bindPopup(popupContent);
    }

    return marker;
  }
}
