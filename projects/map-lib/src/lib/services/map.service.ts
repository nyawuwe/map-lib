import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as L from 'leaflet';
import { MapLibOptions } from '../models/map-options.model';
import { MapLayer } from '../models/layer.model';
import { MapProvider, MapProviderOptions, MapProviderType } from '../models/map-provider.model';
import { MapProviderFactory } from '../providers/map-provider.factory';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private provider: MapProvider | null = null;
  private providerType: MapProviderType = MapProviderType.LEAFLET;
  private layers: Map<string, MapLayer> = new Map();

  private mapReady = new BehaviorSubject<boolean>(false);
  mapReady$ = this.mapReady.asObservable();

  constructor(private providerFactory: MapProviderFactory) { }

  initMap(element: HTMLElement, options: MapLibOptions, providerOptions?: MapProviderOptions): any {
    const defaultProviderOptions: MapProviderOptions = {
      type: MapProviderType.LEAFLET,
      leafletOptions: options
    };

    const mergedProviderOptions = { ...defaultProviderOptions, ...providerOptions };
    this.providerType = mergedProviderOptions.type;

    this.provider = this.providerFactory.createProvider(mergedProviderOptions);
    const map = this.provider.initialize(element, mergedProviderOptions);

    // Si nous utilisons MapBox, il n'y a pas de couche de base à ajouter car elle est incluse dans le style
    if (this.providerType === MapProviderType.LEAFLET) {
      // La couche de base est déjà gérée dans le LeafletProvider
    }

    this.mapReady.next(true);

    // Notifier du changement de fournisseur
    setTimeout(() => {
      const providerChangeEvent = new CustomEvent('map-provider-type-changed', {
        detail: {
          type: this.providerType,
          map: map
        }
      });
      document.dispatchEvent(providerChangeEvent);
    }, 100);

    return map;
  }

  getMap(): any {
    if (!this.provider) {
      console.error('Map not initialized');
      return null;
    }
    return this.provider.getUnderlyingMap();
  }

  addLayer(mapLayer: MapLayer): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    this.layers.set(mapLayer.id, mapLayer);

    // Pour Mapbox, nous devons adapter la couche si elle est au format Leaflet
    if (this.providerType === MapProviderType.MAPBOX && mapLayer.layer instanceof L.Layer) {
      // Conversion d'un type de couche Leaflet vers Mapbox
      if (mapLayer.layer instanceof L.Marker) {
        const marker = mapLayer.layer;
        const latlng = marker.getLatLng();

        // Créer une couche de type marqueur pour Mapbox
        const mapboxLayer = {
          type: 'marker',
          markers: [{
            lngLat: [latlng.lng, latlng.lat],
            options: {},
            popup: marker.getPopup() ? {
              html: marker.getPopup()!.getContent()?.toString() || ''
            } : undefined
          }]
        };

        this.provider.addLayer(mapLayer.id, mapboxLayer, mapLayer.enabled);
      }
      else if (mapLayer.layer instanceof L.TileLayer) {
        // Pour les TileLayer, nous ne pouvons pas les convertir directement
        // mais nous pourrions essayer d'utiliser un style Mapbox similaire
        console.warn('TileLayer non converti pour Mapbox. Utilisez un style Mapbox à la place.');
      }
      else if (mapLayer.layer instanceof L.GeoJSON) {
        // Conversion GeoJSON Leaflet vers Mapbox
        const geojson = mapLayer.layer.toGeoJSON();

        // Créer une couche GeoJSON pour Mapbox
        const mapboxLayer = {
          type: 'geojson',
          data: geojson,
          style: {
            type: 'circle',  // Par défaut
            paint: {
              'circle-radius': 6,
              'circle-color': '#FF0000'
            }
          }
        };

        this.provider.addLayer(mapLayer.id, mapboxLayer, mapLayer.enabled);
      }
      else if (mapLayer.layer instanceof L.LayerGroup) {
        // Pour les groupes, nous devrions traiter chaque couche individuellement
        // mais pour la simplicité, nous allons juste afficher un avertissement
        console.warn('LayerGroup non complètement converti pour Mapbox. Certaines fonctionnalités peuvent ne pas fonctionner.');
      }
      else {
        console.warn(`Type de couche non pris en charge pour la conversion vers Mapbox: ${mapLayer.layer.constructor.name}`);
      }
    }
    else {
      // Utilisation directe du provider
      this.provider.addLayer(mapLayer.id, mapLayer.layer, mapLayer.enabled);
    }
  }

  removeLayer(layerId: string): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    this.provider.removeLayer(layerId);
    this.layers.delete(layerId);
  }

  toggleLayer(layerId: string, visible: boolean): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    this.provider.toggleLayer(layerId, visible);

    const layer = this.layers.get(layerId);
    if (layer) {
      this.layers.set(layerId, { ...layer, enabled: visible });
    }
  }

  getLayers(): MapLayer[] {
    return Array.from(this.layers.values());
  }

  fitBounds(bounds: L.LatLngBoundsExpression): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    this.provider.fitBounds(bounds);
  }

  setView(center: L.LatLngExpression, zoom?: number): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    this.provider.setView(center, zoom);
  }

  resize(): void {
    if (this.provider) {
      this.provider.resize();
    }
  }

  getCurrentProviderType(): MapProviderType {
    return this.providerType;
  }

  getCenter(): L.LatLngExpression {
    if (!this.provider) {
      console.error('Map not initialized');
      return [0, 0]; // Position par défaut
    }

    const map = this.provider.getUnderlyingMap();

    if (this.providerType === MapProviderType.LEAFLET) {
      return (map as L.Map).getCenter();
    } else if (this.providerType === MapProviderType.MAPBOX) {
      const center = map.getCenter();
      // Convertir de [lng, lat] en [lat, lng] pour être compatible avec Leaflet
      return [center.lat, center.lng];
    }

    return [0, 0]; // Position par défaut
  }

  getZoom(): number {
    if (!this.provider) {
      console.error('Map not initialized');
      return 5; // Zoom par défaut
    }

    const map = this.provider.getUnderlyingMap();

    if (this.providerType === MapProviderType.LEAFLET) {
      return (map as L.Map).getZoom();
    } else if (this.providerType === MapProviderType.MAPBOX) {
      return map.getZoom();
    }

    return 5; // Zoom par défaut
  }

  destroyMap(): void {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
      this.mapReady.next(false);

      // Notifier que la carte a été détruite
      const providerChangeEvent = new CustomEvent('map-destroyed', {
        detail: {
          previousType: this.providerType
        }
      });
      document.dispatchEvent(providerChangeEvent);
    }

    // Conserver les couches pour pouvoir les réutiliser lors de la réinitialisation
  }

  /**
   * Déplace la vue de la carte vers une position spécifique avec animation
   * @param position Position [lat, lng] vers laquelle naviguer
   * @param zoom Niveau de zoom à appliquer
   * @param options Options supplémentaires pour l'animation
   */
  flyTo(position: L.LatLngExpression, zoom?: number, options?: L.ZoomPanOptions): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    const map = this.provider.getUnderlyingMap();
    if (this.providerType === MapProviderType.LEAFLET) {
      const leafletMap = map as L.Map;
      leafletMap.flyTo(position, zoom, options);
    } else if (this.providerType === MapProviderType.MAPBOX) {
      // Adapter pour Mapbox si nécessaire
      if (Array.isArray(position)) {
        // Convertir de [lat, lng] à [lng, lat] pour Mapbox
        map.flyTo({
          center: [position[1], position[0]],
          zoom: zoom || map.getZoom(),
          ...options
        });
      }
    }
  }

  /**
   * Ouvre un popup à une position spécifique sur la carte
   * @param position Position [lat, lng] où ouvrir le popup
   */
  openPopupAtPosition(position: L.LatLngExpression): void {
    if (!this.provider) {
      console.error('Map not initialized');
      return;
    }

    const map = this.provider.getUnderlyingMap();
    if (this.providerType === MapProviderType.LEAFLET) {
      const leafletMap = map as L.Map;

      // Rechercher un marqueur à cette position
      let foundMarker = false;
      this.layers.forEach(layer => {
        if (layer.layer instanceof L.LayerGroup) {
          layer.layer.eachLayer(sublayer => {
            if (sublayer instanceof L.Marker) {
              const markerPos = sublayer.getLatLng();
              const targetPos = L.latLng(position);

              // Vérifier si les positions sont proches (tolérance de 10 mètres)
              if (markerPos.distanceTo(targetPos) < 10) {
                sublayer.openPopup();
                foundMarker = true;
              }
            }
          });
        } else if (layer.layer instanceof L.Marker) {
          const markerPos = layer.layer.getLatLng();
          const targetPos = L.latLng(position);

          if (markerPos.distanceTo(targetPos) < 10) {
            layer.layer.openPopup();
            foundMarker = true;
          }
        }
      });

      // Si aucun marqueur n'est trouvé, on peut créer un popup temporaire
      if (!foundMarker) {
        L.popup()
          .setLatLng(position)
          .setContent('Position sélectionnée')
          .openOn(leafletMap);
      }
    } else if (this.providerType === MapProviderType.MAPBOX) {
      // Implémentation pour Mapbox si nécessaire
      console.log('Ouverture de popup non implémentée pour Mapbox');
    }
  }
}
