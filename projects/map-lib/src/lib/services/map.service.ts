import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as L from 'leaflet';
import { MapLibOptions } from '../models/map-options.model';
import { MapLayer } from '../models/layer.model';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: L.Map | null = null;
  private layers: Map<string, MapLayer> = new Map();

  private mapReady = new BehaviorSubject<boolean>(false);
  mapReady$ = this.mapReady.asObservable();

  constructor() { }

  initMap(element: HTMLElement, options: MapLibOptions): L.Map {
    const defaultOptions: MapLibOptions = {
      center: [48.864716, 2.349014],
      zoom: 5,
      minZoom: 3,
      maxZoom: 18
    };

    const mergedOptions = { ...defaultOptions, ...options };

    this.map = L.map(element, {
      center: mergedOptions.center,
      zoom: mergedOptions.zoom,
      minZoom: mergedOptions.minZoom,
      maxZoom: mergedOptions.maxZoom,
      zoomControl: false,
      ...mergedOptions.options
    });

    // Ajout d'une couche de base (OpenStreetMap)
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    baseLayer.addTo(this.map);

    // Ajout de la couche de base à notre gestionnaire de couches
    this.addLayer({
      id: 'base-layer',
      name: 'Carte de base',
      layer: baseLayer,
      enabled: true,
      zIndex: 0
    });

    this.mapReady.next(true);
    return this.map;
  }

  getMap(): L.Map | null {
    return this.map;
  }

  addLayer(mapLayer: MapLayer): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    this.layers.set(mapLayer.id, mapLayer);

    if (mapLayer.enabled) {
      mapLayer.layer.addTo(this.map);
    }
  }

  removeLayer(layerId: string): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    const layer = this.layers.get(layerId);
    if (layer) {
      this.map.removeLayer(layer.layer);
      this.layers.delete(layerId);
    }
  }

  toggleLayer(layerId: string, visible: boolean): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    const layer = this.layers.get(layerId);
    if (layer) {
      if (visible && !layer.enabled) {
        this.map.addLayer(layer.layer);
        layer.enabled = true;
      } else if (!visible && layer.enabled) {
        this.map.removeLayer(layer.layer);
        layer.enabled = false;
      }
      this.layers.set(layerId, { ...layer, enabled: visible });
    }
  }

  getLayers(): MapLayer[] {
    return Array.from(this.layers.values());
  }

  fitBounds(bounds: L.LatLngBoundsExpression): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    this.map.fitBounds(bounds);
  }

  setView(center: L.LatLngExpression, zoom?: number): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    this.map.setView(center, zoom);
  }

  resize(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}
