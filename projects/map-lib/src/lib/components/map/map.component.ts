import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ChangeDetectorRef, AfterViewInit, Renderer2 } from '@angular/core';
import { MapService } from '../../services/map.service';
import { MapLibOptions } from '../../models/map-options.model';
import * as L from 'leaflet';
import { MapControlsComponent, LocationData } from '../map-controls/map-controls.component';
import { CommonModule } from '@angular/common';
import { PlusCodeCardComponent } from '../plus-code-card/plus-code-card.component';
import { MapProviderOptions, MapProviderType } from '../../models/map-provider.model';
import { LayerControlComponent } from '../layer-control/layer-control.component';
import { LayerInfo } from '../../models/layer-info.model';
import { MapConfigService } from '../../services/map-config.service';

@Component({
  selector: 'lib-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [CommonModule, MapControlsComponent, PlusCodeCardComponent, LayerControlComponent]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @ViewChild('layerControl', { static: false }) layerControl!: LayerControlComponent;
  @ViewChild(PlusCodeCardComponent, { static: false }) plusCodeCard!: PlusCodeCardComponent;

  @Input() options: MapLibOptions = {};
  @Input() providerOptions?: MapProviderOptions;

  map: any = null;
  mapProviderType: MapProviderType = MapProviderType.LEAFLET;
  private providerChangeEventListener: () => void = () => { };

  constructor(
    private mapService: MapService,
    private changeDetectorRef: ChangeDetectorRef,
    private mapConfig: MapConfigService,
    private renderer: Renderer2
  ) {
    console.log('MapComponent created');
  }

  ngOnInit(): void {
    console.log('MapComponent initialized');

    if (!this.providerOptions) {
      this.providerOptions = {
        type: this.mapConfig.defaultProvider,
        apiKey: this.mapConfig.mapboxApiKey,
        mapStyle: this.mapConfig.defaultMapStyle
      };
    }

    this.initMap();

    this.setupProviderChangeListener();
  }

  ngAfterViewInit(): void {
    console.log('MapComponent view initialized');
    console.log('LayerControl component reference:', this.layerControl ? 'available' : 'not available');

    if (this.layerControl) {
      console.log('Setting current provider in LayerControl');
      this.layerControl.currentProvider = this.mapProviderType;

      this.renderer.setAttribute(
        this.layerControl.constructor.prototype.providerChange.prototype,
        'map-provider-change',
        'true'
      );
    }
  }

  ngOnDestroy(): void {
    console.log('MapComponent destroyed');

    this.providerChangeEventListener();

    if (this.map) {
      if (this.mapProviderType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
        this.map.remove();
      }
    }
  }

  setupProviderChangeListener(): void {
    const handler = (event: any) => {
      console.log('Custom provider change event detected:', event.detail);
      if (event.detail && typeof event.detail.providerType !== 'undefined') {
        this.onProviderChange(event.detail.providerType);
      }
    };

    document.addEventListener('map-provider-change', handler);
    this.providerChangeEventListener = () => {
      document.removeEventListener('map-provider-change', handler);
    };
  }

  onLocationFound(e: LocationData): void {
    if (this.plusCodeCard) {
      if (e.latlng instanceof L.LatLng) {
        this.plusCodeCard.show(e.latlng.lat, e.latlng.lng);
      } else {
        this.plusCodeCard.show(e.latlng[0], e.latlng[1]);
      }
    }
  }

  onLocationError(e: any): void {
    if (this.plusCodeCard) {
      this.plusCodeCard.hide();
    }
  }

  onProviderChange(providerType: MapProviderType): void {
    console.log(`MapComponent: Provider change event received for: ${providerType}`);

    if (this.mapProviderType === providerType) {
      console.log('MapComponent: Fournisseur déjà actif, aucun changement nécessaire');
      return;
    }

    const currentLayers: LayerInfo[] = JSON.parse(JSON.stringify(
      this.mapService.getLayers()
        .filter(layer => layer.id !== 'base-layer')
        .map(layer => ({
          id: layer.id,
          name: layer.name,
          enabled: layer.enabled,
          type: layer.type,
          zIndex: layer.zIndex
        }))
    ));

    console.log(`MapComponent: Couches à sauvegarder: ${currentLayers.length}`);

    try {
      const mapCenter = this.mapService.getCenter();
      const mapZoom = this.mapService.getZoom();

      console.log(`MapComponent: Position actuelle: ${JSON.stringify(mapCenter)}, zoom: ${mapZoom}`);

      this.mapService.destroyMap();
      this.map = null;

      let apiKey = '';
      if (providerType === MapProviderType.MAPBOX) {
        apiKey = this.providerOptions?.apiKey || this.mapConfig.mapboxApiKey;

        if (!apiKey) {
          console.error('MapComponent: Aucune clé API Mapbox trouvée.');
          alert('Erreur: Aucune clé API Mapbox configurée. Veuillez consulter la console pour plus de détails.');
          return;
        }
      }

      const newProviderOptions: MapProviderOptions = {
        type: providerType,
        leafletOptions: this.options,
        apiKey: apiKey,
        mapStyle: this.providerOptions?.mapStyle || this.mapConfig.defaultMapStyle
      };

      const newOptions: MapLibOptions = {
        ...this.options,
        center: mapCenter,
        zoom: mapZoom
      };

      console.log('MapComponent: Initialisation de la nouvelle carte...');
      console.log('MapComponent: Options:', JSON.stringify(newOptions));
      console.log('MapComponent: Provider options:', JSON.stringify({
        ...newProviderOptions,
        apiKey: apiKey ? '[REDACTED]' : ''
      }));

      this.map = this.mapService.initMap(this.mapContainer.nativeElement, newOptions, newProviderOptions);
      this.mapProviderType = this.mapService.getCurrentProviderType();

      // Diffuser l'événement de changement de fournisseur
      const providerChangeEvent = new CustomEvent('map-provider-change', {
        detail: {
          providerType: this.mapProviderType,
          map: this.map
        }
      });

      // Émettre l'événement pour que les composants enfants puissent réagir
      document.dispatchEvent(providerChangeEvent);

      console.log(`MapComponent: Carte initialisée avec le fournisseur: ${this.mapProviderType}`);

      this.changeDetectorRef.detectChanges();

      if (this.layerControl) {
        console.log('MapComponent: Mise à jour du provider dans layerControl');
        this.layerControl.currentProvider = this.mapProviderType;
      } else {
        console.warn('MapComponent: layerControl non disponible');
      }

      setTimeout(() => {
        console.log('MapComponent: Restauration des couches...');

        if (currentLayers.length > 0) {
          currentLayers.forEach((layerInfo: LayerInfo) => {
            try {
              let newLayer: any;

              if (layerInfo.type === 'marker' && providerType === MapProviderType.LEAFLET) {
                newLayer = L.marker([48.8566, 2.3522]).bindPopup('Paris');
              }
              else if (layerInfo.type === 'marker' && providerType === MapProviderType.MAPBOX) {
                newLayer = {
                  type: 'marker',
                  markers: [{
                    lngLat: [2.3522, 48.8566],
                    popup: { html: 'Paris' }
                  }]
                };
              }

              if (newLayer) {
                this.mapService.addLayer({
                  id: layerInfo.id,
                  name: layerInfo.name,
                  layer: newLayer,
                  enabled: layerInfo.enabled,
                  zIndex: layerInfo.zIndex,
                  type: layerInfo.type
                });
              }
            } catch (err) {
              console.error(`MapComponent: Erreur lors de la restauration de la couche ${layerInfo.id}:`, err);
            }
          });
        }

        console.log('MapComponent: Changement de fournisseur terminé');
      }, 500);
    } catch (error) {
      console.error('MapComponent: Erreur lors du changement de fournisseur:', error);
    }
  }

  private initMap(): void {
    console.log('MapComponent: Initialisation de la carte');
    if (!this.mapContainer) {
      console.error('MapComponent: Élément de carte non trouvé');
      return;
    }

    try {
      this.map = this.mapService.initMap(this.mapContainer.nativeElement, this.options, this.providerOptions);
      this.mapProviderType = this.mapService.getCurrentProviderType();
      console.log(`MapComponent: Carte initialisée avec le fournisseur: ${this.mapProviderType}`);
    } catch (error) {
      console.error('MapComponent: Erreur lors de l\'initialisation de la carte:', error);
    }
  }
}
