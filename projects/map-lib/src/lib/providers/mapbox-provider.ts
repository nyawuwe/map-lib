import { MapProvider, MapProviderOptions } from '../models/map-provider.model';
import { LatLngExpression } from 'leaflet';
import mapboxgl from 'mapbox-gl';

export class MapboxProvider implements MapProvider {
    private map: mapboxgl.Map | null = null;
    private layers: Map<string, any> = new Map();

    initialize(element: HTMLElement, options: MapProviderOptions): mapboxgl.Map {
        if (!options.apiKey) {
            throw new Error('Mapbox API key is required');
        }

        mapboxgl.accessToken = options.apiKey;

        const defaultCenter: [number, number] = [2.349014, 48.864716]; // Longitude puis Latitude pour Mapbox
        const defaultZoom = 5;

        this.map = new mapboxgl.Map({
            container: element,
            style: options.mapStyle || 'mapbox://styles/mapbox/streets-v11',
            center: defaultCenter,
            zoom: defaultZoom
        });

        // Nous définissons une couche de base vide juste pour maintenir la cohérence
        // avec l'API de notre service (Mapbox gère les couches différemment de Leaflet)
        this.layers.set('base-layer', {
            id: 'base-layer',
            type: 'base'
        });

        return this.map;
    }

    addLayer(layerId: string, layer: any, enabled: boolean): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        // Pour Mapbox, nous devons gérer différents types de couches
        if (layer.type === 'mapbox-source-layer') {
            // Ajouter une source de données
            this.map.addSource(layerId, layer.source);

            // Ajouter la couche qui utilise cette source
            layer.layers.forEach((l: any) => {
                if (enabled && this.map) {
                    this.map.addLayer(l);
                }
            });

            this.layers.set(layerId, {
                id: layerId,
                source: layer.source,
                layers: layer.layers,
                enabled
            });
        }
        else if (layer.type === 'mapbox-layer') {
            // Ajouter directement une couche Mapbox
            if (enabled) {
                this.map.addLayer(layer.layer);
            }
            this.layers.set(layerId, {
                id: layerId,
                layer: layer.layer,
                enabled
            });
        }
        else if (layer.type === 'geojson') {
            // Ajouter une source GeoJSON
            this.map.addSource(layerId, {
                type: 'geojson',
                data: layer.data
            });

            // Ajouter la couche qui utilise cette source
            const layerDef = {
                id: layerId + '-layer',
                type: layer.style.type || 'circle',
                source: layerId,
                paint: layer.style.paint || {}
            };

            if (enabled) {
                this.map.addLayer(layerDef);
            }

            this.layers.set(layerId, {
                id: layerId,
                layerDef,
                data: layer.data,
                enabled
            });
        }
        else if (layer.type === 'marker') {
            // Pour les marqueurs Mapbox
            const markers: mapboxgl.Marker[] = [];

            if (layer.markers) {
                layer.markers.forEach((markerDef: any) => {
                    const marker = new mapboxgl.Marker(markerDef.options || {})
                        .setLngLat(markerDef.lngLat);

                    if (markerDef.popup) {
                        marker.setPopup(new mapboxgl.Popup({ offset: 25 })
                            .setHTML(markerDef.popup.html));
                    }

                    if (enabled && this.map) {
                        marker.addTo(this.map);
                    }

                    markers.push(marker);
                });
            }

            this.layers.set(layerId, {
                id: layerId,
                markers,
                enabled
            });
        }
    }

    removeLayer(layerId: string): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        const layer = this.layers.get(layerId);
        if (layer) {
            if (layer.type === 'base') {
                // Ne rien faire pour la couche de base
                return;
            }

            if (layer.markers) {
                // Supprimer les marqueurs
                layer.markers.forEach((marker: mapboxgl.Marker) => {
                    marker.remove();
                });
            }
            else if (layer.layers) {
                // Supprimer les couches puis la source
                layer.layers.forEach((l: any) => {
                    if (this.map && this.map.getLayer(l.id)) {
                        this.map.removeLayer(l.id);
                    }
                });

                if (this.map.getSource(layerId)) {
                    this.map.removeSource(layerId);
                }
            }
            else if (layer.layer) {
                // Supprimer une seule couche
                if (this.map.getLayer(layer.layer.id)) {
                    this.map.removeLayer(layer.layer.id);
                }
            }
            else if (layer.layerDef) {
                // Supprimer la couche puis la source
                if (this.map.getLayer(layer.layerDef.id)) {
                    this.map.removeLayer(layer.layerDef.id);
                }

                if (this.map.getSource(layerId)) {
                    this.map.removeSource(layerId);
                }
            }

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
            if (layer.type === 'base') {
                // Ne rien faire pour la couche de base
                return;
            }

            if (layer.markers) {
                // Afficher/masquer les marqueurs
                layer.markers.forEach((marker: mapboxgl.Marker) => {
                    if (visible && this.map) {
                        marker.addTo(this.map);
                    } else {
                        marker.remove();
                    }
                });

                layer.enabled = visible;
            }
            else if (layer.layers) {
                // Afficher/masquer les couches
                layer.layers.forEach((l: any) => {
                    if (visible) {
                        if (this.map && !this.map.getLayer(l.id)) {
                            this.map.addLayer(l);
                        } else if (this.map) {
                            this.map.setLayoutProperty(l.id, 'visibility', 'visible');
                        }
                    } else if (this.map && this.map.getLayer(l.id)) {
                        this.map.setLayoutProperty(l.id, 'visibility', 'none');
                    }
                });

                layer.enabled = visible;
            }
            else if (layer.layer) {
                // Afficher/masquer une seule couche
                if (visible) {
                    if (!this.map.getLayer(layer.layer.id)) {
                        this.map.addLayer(layer.layer);
                    } else {
                        this.map.setLayoutProperty(layer.layer.id, 'visibility', 'visible');
                    }
                } else {
                    if (this.map.getLayer(layer.layer.id)) {
                        this.map.setLayoutProperty(layer.layer.id, 'visibility', 'none');
                    }
                }

                layer.enabled = visible;
            }
            else if (layer.layerDef) {
                // Afficher/masquer la couche
                if (visible) {
                    if (!this.map.getLayer(layer.layerDef.id)) {
                        this.map.addLayer(layer.layerDef);
                    } else {
                        this.map.setLayoutProperty(layer.layerDef.id, 'visibility', 'visible');
                    }
                } else {
                    if (this.map.getLayer(layer.layerDef.id)) {
                        this.map.setLayoutProperty(layer.layerDef.id, 'visibility', 'none');
                    }
                }

                layer.enabled = visible;
            }
        }
    }

    fitBounds(bounds: [[number, number], [number, number]]): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        this.map.fitBounds(bounds);
    }

    setView(center: LatLngExpression, zoom?: number): void {
        if (!this.map) {
            console.error('Map not initialized');
            return;
        }

        // Convertir LatLngExpression en [lng, lat] pour Mapbox
        let lngLat: [number, number];
        if (Array.isArray(center)) {
            // Si centre est [lat, lng], convertir en [lng, lat] pour Mapbox
            lngLat = [center[1], center[0]];
        } else {
            // Si centre est {lat: number, lng: number}
            lngLat = [(center as any).lng, (center as any).lat];
        }

        this.map.setCenter(lngLat);
        if (zoom !== undefined) {
            this.map.setZoom(zoom);
        }
    }

    resize(): void {
        if (this.map) {
            this.map.resize();
        }
    }

    destroy(): void {
        if (this.map) {
            // Supprimer toutes les couches d'abord
            for (const layerId of this.layers.keys()) {
                this.removeLayer(layerId);
            }

            this.map.remove();
            this.map = null;
        }
        this.layers.clear();
    }

    getUnderlyingMap(): mapboxgl.Map | null {
        return this.map;
    }
}
