import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ChangeDetectorRef, AfterViewInit, Renderer2 } from '@angular/core';
import { MapService } from '../../services/map.service';
import { MapLibOptions } from '../../models/map-options.model';
import * as L from 'leaflet';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { CommonModule } from '@angular/common';
import { PlusCodeCardComponent } from '../plus-code-card/plus-code-card.component';
import { MapProviderOptions, MapProviderType } from '../../models/map-provider.model';
import { LayerControlComponent } from '../layer-control/layer-control.component';
import { LayerInfo } from '../../models/layer-info.model';
import { MapConfigService } from '../../services/map-config.service';

@Component({
  selector: 'lib-map',
  template: `
    <div class="map-container">
      <div #mapContainer class="map-element"></div>
      <lib-map-controls *ngIf="map"
        [map]="map"
        (locationFound)="onLocationFound($event)"
        (locationError)="onLocationError($event)">
      </lib-map-controls>
      <lib-plus-code-card *ngIf="map"></lib-plus-code-card>
      <div class="layer-control-container" *ngIf="map">
        <lib-layer-control #layerControl (providerChange)="onProviderChange($event)"></lib-layer-control>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 100%;
      display: block;
      box-sizing: border-box;
      position: relative;
    }
    .map-element {
      width: 100%;
      height: 100%;
    }
    .layer-control-container {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
    }
  `],
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
    // Si aucun providerOptions n'est fourni, utilisez la configuration par défaut
    if (!this.providerOptions) {
      this.providerOptions = {
        type: this.mapConfig.defaultProvider,
        apiKey: this.mapConfig.mapboxApiKey,
        mapStyle: this.mapConfig.defaultMapStyle
      };
    }

    this.initMap();

    // Ajouter un écouteur d'événement global pour les changements de fournisseur
    this.setupProviderChangeListener();
  }

  ngAfterViewInit(): void {
    console.log('MapComponent view initialized');
    console.log('LayerControl component reference:', this.layerControl ? 'available' : 'not available');

    // S'assurer que le LayerControl est correctement configuré après l'initialisation de la vue
    if (this.layerControl) {
      console.log('Setting current provider in LayerControl');
      this.layerControl.currentProvider = this.mapProviderType;

      // Ajouter un attribut personnalisé pour faciliter la sélection DOM
      this.renderer.setAttribute(
        this.layerControl.constructor.prototype.providerChange.prototype,
        'map-provider-change',
        'true'
      );
    }
  }

  ngOnDestroy(): void {
    console.log('MapComponent destroyed');
    // Nettoyer l'écouteur d'événement
    this.providerChangeEventListener();

    // Nous utilisons le provider à travers le service
    if (this.map) {
      if (this.mapProviderType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
        this.map.remove();
      }
      // Pour Mapbox, la suppression est gérée par le provider
    }
  }

  setupProviderChangeListener(): void {
    // Configurer un écouteur d'événement personnalisé pour les changements de fournisseur
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

  onLocationFound(e: L.LocationEvent): void {
    if (this.plusCodeCard) {
      this.plusCodeCard.show(e.latlng.lat, e.latlng.lng);
    }
  }

  onLocationError(e: L.ErrorEvent): void {
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

    // Sauvegarde des couches actuelles (copie profonde pour éviter toute référence)
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
      // Récupération des informations avant destruction
      const mapCenter = this.mapService.getCenter();
      const mapZoom = this.mapService.getZoom();

      console.log(`MapComponent: Position actuelle: ${JSON.stringify(mapCenter)}, zoom: ${mapZoom}`);

      // Destruction de la carte actuelle
      this.mapService.destroyMap();
      this.map = null;

      // Création des options pour le nouveau fournisseur
      let apiKey = '';
      if (providerType === MapProviderType.MAPBOX) {
        // Utiliser la clé API Mapbox de la configuration ou des options existantes
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

      // Mise à jour des options de la carte avec la position actuelle
      const newOptions: MapLibOptions = {
        ...this.options,
        center: mapCenter,
        zoom: mapZoom
      };

      console.log('MapComponent: Initialisation de la nouvelle carte...');
      console.log('MapComponent: Options:', JSON.stringify(newOptions));
      console.log('MapComponent: Provider options:', JSON.stringify({
        ...newProviderOptions,
        apiKey: apiKey ? '[REDACTED]' : '' // Ne pas logger la clé API
      }));

      // Initialisation de la nouvelle carte
      this.map = this.mapService.initMap(this.mapContainer.nativeElement, newOptions, newProviderOptions);
      this.mapProviderType = this.mapService.getCurrentProviderType();

      console.log(`MapComponent: Carte initialisée avec le fournisseur: ${this.mapProviderType}`);

      // Forcer la mise à jour du composant
      this.changeDetectorRef.detectChanges();

      // Mettre à jour le contrôle de couches avec le nouveau fournisseur
      if (this.layerControl) {
        console.log('MapComponent: Mise à jour du provider dans layerControl');
        this.layerControl.currentProvider = this.mapProviderType;
      } else {
        console.warn('MapComponent: layerControl non disponible');
      }

      // Rétablir les couches avec un délai pour s'assurer que la carte est bien initialisée
      setTimeout(() => {
        console.log('MapComponent: Restauration des couches...');

        if (currentLayers.length > 0) {
          currentLayers.forEach((layerInfo: LayerInfo) => {
            try {
              // Recréer chaque couche selon son type
              let newLayer: any;

              if (layerInfo.type === 'marker' && providerType === MapProviderType.LEAFLET) {
                // Créer un marqueur Leaflet
                newLayer = L.marker([48.8566, 2.3522]).bindPopup('Paris');
              }
              else if (layerInfo.type === 'marker' && providerType === MapProviderType.MAPBOX) {
                // Créer un marqueur Mapbox
                newLayer = {
                  type: 'marker',
                  markers: [{
                    lngLat: [2.3522, 48.8566],
                    popup: { html: 'Paris' }
                  }]
                };
              }
              // Ajoutez d'autres types de couches au besoin

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
