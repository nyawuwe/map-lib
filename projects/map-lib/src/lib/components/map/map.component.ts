import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ChangeDetectorRef, AfterViewInit, Renderer2, Output, EventEmitter } from '@angular/core';
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
import { PopupActionsService, FavoritePlace } from '../../services/popup-actions.service';
import { PopupService, ClickedPointEvent } from '../../services/popup.service';
import { PopupInfo } from '../../models/popup-info.model';
import { Subscription } from 'rxjs';
import { ToastComponent } from '../toast/toast.component';
import { ToastService } from '../../services/toast.service';
import { ClickedPointButtonConfig } from '../../components/clicked-point-popup/clicked-point-popup.component';

// Interface pour la configuration des boutons du popup de point cliqué
export interface ClickedPointPopupConfig {
  button1?: ClickedPointButtonConfig;
  button2?: ClickedPointButtonConfig;
  button3?: ClickedPointButtonConfig;
}

@Component({
  selector: 'lib-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [CommonModule, MapControlsComponent, PlusCodeCardComponent, LayerControlComponent, ToastComponent]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @ViewChild('layerControl', { static: false }) layerControl!: LayerControlComponent;
  @ViewChild(PlusCodeCardComponent, { static: false }) plusCodeCard!: PlusCodeCardComponent;

  @Input() options: MapLibOptions = {};
  @Input() providerOptions?: MapProviderOptions;
  @Input() clickedPointPopupConfig: ClickedPointPopupConfig = {};

  @Output() clickedPointButtonClick = new EventEmitter<ClickedPointEvent>();

  map: any = null;
  mapProviderType: MapProviderType = MapProviderType.LEAFLET;
  private providerChangeEventListener: () => void = () => { };
  private favoriteMarkersLayer: any;
  private favoritesSubscription: Subscription | null = null;
  private clickMarker: any = null;
  private clickedPointEventsSubscription: Subscription | null = null;

  constructor(
    private mapService: MapService,
    private changeDetectorRef: ChangeDetectorRef,
    private mapConfig: MapConfigService,
    private renderer: Renderer2,
    private popupActionsService: PopupActionsService,
    private popupService: PopupService,
    private toastService: ToastService
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
    this.setupMapClickListener();

    // S'abonner aux changements des favoris
    this.initFavoritesLayer();

    // S'abonner aux événements de clic sur les boutons du popup
    this.clickedPointEventsSubscription = this.popupService.getClickedPointEvents().subscribe(event => {
      this.clickedPointButtonClick.emit(event);
    });

    // Ajouter un écouteur pour l'événement d'arrêt de localisation
    document.addEventListener('location-stopped', this.onLocationStopped.bind(this));
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

    // Désabonner des favoris
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }

    // Désabonner des événements de point cliqué
    if (this.clickedPointEventsSubscription) {
      this.clickedPointEventsSubscription.unsubscribe();
    }

    if (this.map) {
      if (this.mapProviderType === MapProviderType.LEAFLET && this.map instanceof L.Map) {
        this.map.remove();
      }
    }

    // Retirer l'écouteur d'événement d'arrêt de localisation
    document.removeEventListener('location-stopped', this.onLocationStopped.bind(this));
  }

  /**
   * Initialiser la couche des favoris et s'abonner aux changements
   */
  private initFavoritesLayer(): void {
    if (this.mapProviderType === MapProviderType.LEAFLET) {
      // Créer une couche pour les favoris
      this.favoriteMarkersLayer = L.layerGroup();
      this.favoriteMarkersLayer.addTo(this.map);

      // S'abonner aux changements des favoris
      this.favoritesSubscription = this.popupActionsService.getFavorites().subscribe(favorites => {
        this.updateFavoritesLayer(favorites);
      });
    }
  }

  /**
   * Configurer l'écouteur de clic sur la carte
   */
  private setupMapClickListener(): void {
    if (this.map && this.mapProviderType === MapProviderType.LEAFLET) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.handleMapClick(e.latlng.lat, e.latlng.lng);
      });
    }
  }

  /**
   * Gérer le clic sur la carte
   */
  handleMapClick(lat: number, lng: number): void {
    // Supprimer le marqueur précédent s'il existe
    if (this.clickMarker) {
      if (this.mapProviderType === MapProviderType.LEAFLET) {
        this.map.removeLayer(this.clickMarker);
      }
    }

    // Créer un nouveau marqueur à l'emplacement du clic
    if (this.mapProviderType === MapProviderType.LEAFLET) {
      // Création d'un marqueur circulaire personnalisé
      const concenticCircleIcon = L.divIcon({
        className: 'custom-concentric-marker',
        html: `
          <div class="marker-halo"></div>
          <div class="marker-ring"></div>
          <div class="marker-circle"></div>
        `,
        iconSize: [48, 48],     // taille de l'icône
        iconAnchor: [24, 24],   // point de l'icône qui correspondra à l'emplacement du marqueur
        popupAnchor: [0, -24]   // point à partir duquel le popup doit s'ouvrir par rapport à l'iconAnchor
      });

      // Créer le marqueur avec l'icône et l'ajouter à la carte
      this.clickMarker = L.marker([lat, lng], {
        icon: concenticCircleIcon,
        riseOnHover: true,
        zIndexOffset: 1000  // S'assurer que le marqueur est au-dessus des autres éléments
      }).addTo(this.map);

      // Utiliser le popup spécifique pour point cliqué avec la configuration des boutons
      this.popupService.bindClickedPointPopupToMarker(
        this.clickMarker,
        undefined,
        this.clickedPointPopupConfig
      );

      // Ouvrir automatiquement le popup
      this.clickMarker.openPopup();

      // Supprimer le marqueur lorsque le popup est fermé
      const currentMarker = this.clickMarker; // Capturer dans une variable locale
      this.clickMarker.getPopup().on('remove', () => {
        if (this.map && currentMarker) {
          this.map.removeLayer(currentMarker);
          if (this.clickMarker === currentMarker) {
            this.clickMarker = null;
          }
        }
      });
    }
  }

  /**
   * Mettre à jour la couche des favoris sur la carte
   */
  private updateFavoritesLayer(favorites: FavoritePlace[]): void {
    if (!this.map || !this.favoriteMarkersLayer) return;

    if (this.mapProviderType === MapProviderType.LEAFLET) {
      // Vider la couche actuelle
      this.favoriteMarkersLayer.clearLayers();

      // Ajouter les marqueurs pour chaque favori
      favorites.forEach(favorite => {
        // Créer un popup pour ce favori
        const popupInfo: PopupInfo = {
          title: favorite.title,
          certified: false,
          gpsPosition: {
            latitude: favorite.latitude,
            longitude: favorite.longitude
          }
        };

        // Créer le marqueur avec une icône spéciale pour les favoris
        const markerOptions: L.MarkerOptions = {
          title: favorite.title,
          alt: favorite.title,
          riseOnHover: true
        };

        const marker = L.marker([favorite.latitude, favorite.longitude], markerOptions);

        // Ajouter le popup au marqueur
        this.popupService.bindPopupToMarker(marker, popupInfo);

        // Ajouter le marqueur à la couche des favoris
        marker.addTo(this.favoriteMarkersLayer);
      });
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

  disableLocation(): void {
    if (this.map && this.mapProviderType === MapProviderType.LEAFLET) {
      this.map.stopLocate();
      if (this.plusCodeCard) {
        this.plusCodeCard.hide();
      }
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

      // Désabonner des favoris
      if (this.favoritesSubscription) {
        this.favoritesSubscription.unsubscribe();
        this.favoritesSubscription = null;
      }

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

      // Réinitialiser la couche des favoris
      this.initFavoritesLayer();

      // Reconfigurer l'écouteur de clic
      this.setupMapClickListener();

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
                newLayer = L.marker([6.1099, 1.0496]).bindPopup('Lomé');
              }
              else if (layerInfo.type === 'marker' && providerType === MapProviderType.MAPBOX) {
                newLayer = {
                  type: 'marker',
                  markers: [{
                    lngLat: [1.0496, 6.1099],
                    popup: { html: 'Lomé' }
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

  /**
   * Ajouter un marqueur pour un lieu avec popup
   */
  addMarkerWithPopup(title: string, lat: number, lng: number, options?: any): void {
    if (!this.map) return;

    if (this.mapProviderType === MapProviderType.LEAFLET) {
      const popupInfo: PopupInfo = {
        title: title,
        certified: options?.certified || false,
        postalCode: options?.postalCode,
        plusCode: options?.plusCode,
        gpsPosition: {
          latitude: lat,
          longitude: lng
        },
        imageSrc: options?.imageSrc,
        description: options?.description,
        details: options?.details
      };

      const marker = L.marker([lat, lng], {
        title: title,
        alt: title,
        riseOnHover: true
      });

      this.popupService.bindPopupToMarker(marker, popupInfo);
      marker.addTo(this.map);
    }
  }

  /**
   * Montrer tous les favoris sur la carte avec zoom
   */
  showAllFavorites(): void {
    this.popupActionsService.getFavorites().subscribe(favorites => {
      if (favorites.length === 0) return;

      if (this.mapProviderType === MapProviderType.LEAFLET) {
        // Créer un groupe de coordonnées pour le zoom
        const group = L.featureGroup();

        // Ajouter chaque favori au groupe
        favorites.forEach(favorite => {
          L.marker([favorite.latitude, favorite.longitude]).addTo(group);
        });

        // Zoom sur tous les favoris
        this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    });
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

  onLocationStopped = (): void => {
    if (this.plusCodeCard) {
      this.plusCodeCard.hide();
    }
  }
}
