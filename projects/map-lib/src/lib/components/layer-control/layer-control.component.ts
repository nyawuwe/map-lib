import { Component, OnInit, Output, EventEmitter, ViewEncapsulation, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { MapLayer } from '../../models/layer.model';
import { MapProviderType } from '../../models/map-provider.model';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'lib-layer-control',
  template: `
    <div class="map-layer-control">
      <button class="map-control-button layer-control-button"
              [class.active]="isExpanded"
              (click)="toggleControl($event)"
              aria-label="Contrôle de couches"
              title="Contrôle de couches">
        <i class="fas fa-layer-group"></i>
      </button>

      <div *ngIf="isExpanded" class="layer-control-menu" [@fadeIn]>
        <!-- Section Fournisseur de carte -->
        <div class="control-section">
          <div class="section-header">
            <i class="fas fa-map-marked-alt"></i>
            <span class="section-title">Fournisseur</span>
          </div>

          <div class="section-content">
            <div class="provider-options">
              <div class="provider-option" *ngFor="let provider of providerTypes">
                <input
                  type="radio"
                  name="provider"
                  [id]="'provider-' + provider.value"
                  [value]="provider.value"
                  [checked]="provider.value === currentProvider"
                  (change)="changeProvider(provider.value)"
                />
                <label [for]="'provider-' + provider.value">
                  <i class="fas" [class.fa-globe]="provider.value === 'leaflet'" [class.fa-map]="provider.value === 'mapbox'"></i>
                  {{ provider.label }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Couches -->
        <div class="control-section">
          <div class="section-header">
            <i class="fas fa-layer-group"></i>
            <span class="section-title">Couches</span>
          </div>

          <div class="section-content">
            <div class="layer-list">
              <div *ngFor="let layer of layers" class="layer-item">
                <div class="layer-toggle">
                  <input
                    type="checkbox"
                    [id]="'layer-' + layer.id"
                    [checked]="layer.enabled"
                    (change)="toggleLayer(layer.id, $event)"
                  />
                  <label [for]="'layer-' + layer.id">
                    <i class="fas layer-type-icon"
                      [class.fa-map]="layer.id === 'base-layer'"
                      [class.fa-marker]="layer.type === 'marker'"
                      [class.fa-draw-polygon]="layer.type === 'geojson'"
                      [class.fa-object-group]="!layer.type || (layer.type !== 'marker' && layer.type !== 'geojson' && layer.id !== 'base-layer')"></i>
                    {{ layer.name }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

    .map-layer-control {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 1000;
    }

    .map-control-button {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: none;
      background-color: white;
      color: #333;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    }

    .map-control-button:hover {
      background-color: #f0f0f0;
      transform: translateY(-2px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
    }

    .map-control-button:active {
      background-color: #e8e8e8;
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .map-control-button.active {
      background-color: #4285f4;
      color: white;
    }

    .layer-control-button {
      color: #ff9800;
    }

    .layer-control-button.active {
      background-color: #ff9800;
      color: white;
    }

    .layer-control-menu {
      position: absolute;
      top: 50px;
      right: 0;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      width: 250px;
      overflow: hidden;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 999;
    }

    .control-section {
      border-bottom: 1px solid #e9ecef;
    }

    .control-section:last-child {
      border-bottom: none;
    }

    .section-header {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .section-title {
      flex-grow: 1;
      font-weight: 500;
      margin-left: 10px;
      font-size: 0.95rem;
    }

    .section-content {
      padding: 8px 16px;
      background-color: #ffffff;
    }

    .provider-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .provider-option {
      display: flex;
      align-items: center;
      padding: 6px 0;
    }

    .provider-option input {
      margin-right: 8px;
    }

    .provider-option label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .provider-option label i {
      margin-right: 6px;
      width: 16px;
      text-align: center;
    }

    .layer-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .layer-item {
      display: flex;
      align-items: center;
    }

    .layer-toggle {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .layer-toggle input {
      margin-right: 8px;
    }

    .layer-toggle label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .layer-type-icon {
      margin-right: 6px;
      width: 16px;
      text-align: center;
    }

    @media (max-width: 768px) {
      .layer-control-menu {
        width: 100%;
        max-width: 300px;
        right: 0;
      }
    }
  `],
  animations: [
    trigger('fadeIn', [
      state('void', style({
        opacity: 0,
        transform: 'scale(0.95)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'scale(1)'
      })),
      transition('void => *', [
        animate('200ms ease-out')
      ])
    ])
  ],
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None
})
export class LayerControlComponent implements OnInit {
  layers: MapLayer[] = [];
  isExpanded = false;
  currentProvider: MapProviderType;

  providerTypes = [
    { value: MapProviderType.LEAFLET, label: 'OpenStreetMap' },
    { value: MapProviderType.MAPBOX, label: 'Mapbox' }
  ];

  @Output() providerChange = new EventEmitter<MapProviderType>();

  constructor(
    private mapService: MapService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    this.currentProvider = this.mapService.getCurrentProviderType();
  }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.loadLayers();
        this.currentProvider = this.mapService.getCurrentProviderType();
      }
    });

    // Ajouter le lien FontAwesome si nécessaire
    this.ensureFontAwesomeIsLoaded();

    // Fermer le menu quand on clique à l'extérieur
    this.renderer.listen('document', 'click', (event: Event) => {
      const target = event.target as HTMLElement;
      // Ne pas fermer si on clique sur un élément du menu ou le bouton
      if (this.isExpanded &&
        !this.elementRef.nativeElement.contains(target) &&
        !target.closest('.layer-control-menu') &&
        !target.closest('.layer-control-button')) {
        this.isExpanded = false;
      }
    });
  }

  toggleControl(event: Event): void {
    event.stopPropagation();
    this.isExpanded = !this.isExpanded;
  }

  loadLayers(): void {
    this.layers = this.mapService.getLayers();
  }

  toggleLayer(layerId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.mapService.toggleLayer(layerId, target.checked);
    event.stopPropagation();
  }

  changeProvider(providerType: MapProviderType): void {
    if (this.currentProvider !== providerType) {
      this.currentProvider = providerType;
      this.providerChange.emit(providerType);
      this.dispatchCustomEvent(providerType);
    }
  }

  private dispatchCustomEvent(providerType: MapProviderType): void {
    try {
      const event = new CustomEvent('map-provider-change', {
        bubbles: true,
        detail: { providerType }
      });
      this.elementRef.nativeElement.dispatchEvent(event);
      document.dispatchEvent(event);
    } catch (err) {
      console.error('Error dispatching custom event:', err);
    }
  }

  private ensureFontAwesomeIsLoaded(): void {
    const existingLink = document.querySelector('link[href*="font-awesome"]');
    if (!existingLink) {
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'stylesheet');
      this.renderer.setAttribute(link, 'href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
      this.renderer.setAttribute(link, 'integrity', 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==');
      this.renderer.setAttribute(link, 'crossorigin', 'anonymous');
      this.renderer.setAttribute(link, 'referrerpolicy', 'no-referrer');
      this.renderer.appendChild(document.head, link);
    }
  }
}
