import { Component, OnInit, Output, EventEmitter, ViewEncapsulation, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { MapLayer } from '../../models/layer.model';
import { MapProviderType } from '../../models/map-provider.model';

@Component({
  selector: 'lib-layer-control',
  template: `
    <div class="layer-control">
      <div class="layer-header">
        <div class="layer-title">Couches</div>
        <button class="settings-button p-4" (click)="toggleProviderSelector()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </button>
      </div>

      <div class="provider-selector" *ngIf="showProviderSelector">
        <div class="provider-title">Fournisseur de carte</div>
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
            <label [for]="'provider-' + provider.value">{{ provider.label }}</label>
          </div>
        </div>
      </div>

      <div class="layer-list">
        <div *ngFor="let layer of layers" class="layer-item">
          <input
            type="checkbox"
            [id]="'layer-' + layer.id"
            [checked]="layer.enabled"
            (change)="toggleLayer(layer.id, $event)"
          />
          <label [for]="'layer-' + layer.id">{{ layer.name }}</label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layer-control {
      background-color: white;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.4);
      max-width: 250px;
    }
    .layer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
    }
    .layer-title {
      font-weight: bold;
    }
    .settings-button {
      background: none;
      border: none;
      cursor: pointer;
      color: #555;
      border-radius: 50%;
      padding: 4px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      min-height: 28px;
    }
    .settings-button:hover {
      background-color: #f0f0f0;
      color: #333;
    }
    .provider-selector {
      background-color: #f9f9f9;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid #eee;
    }
    .provider-title {
      font-weight: bold;
      font-size: 0.9em;
      margin-bottom: 4px;
    }
    .provider-options {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .provider-option {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .layer-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .layer-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `],
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None
})
export class LayerControlComponent implements OnInit {
  layers: MapLayer[] = [];
  showProviderSelector = false;
  currentProvider: MapProviderType;

  providerTypes = [
    { value: MapProviderType.LEAFLET, label: 'Leaflet (OpenStreetMap)' },
    { value: MapProviderType.MAPBOX, label: 'Mapbox' }
  ];

  @Output() providerChange = new EventEmitter<MapProviderType>();

  constructor(
    private mapService: MapService,
    private elementRef: ElementRef
  ) {
    this.currentProvider = this.mapService.getCurrentProviderType();
    console.log('LayerControlComponent initialized with provider:', this.currentProvider);
  }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.loadLayers();
        this.currentProvider = this.mapService.getCurrentProviderType();
        console.log('Map is ready, current provider:', this.currentProvider);
      }
    });
  }

  loadLayers(): void {
    this.layers = this.mapService.getLayers();
    console.log('Layers loaded:', this.layers.length);
  }

  toggleLayer(layerId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log(`Toggle layer ${layerId} to ${target.checked}`);
    this.mapService.toggleLayer(layerId, target.checked);
  }

  toggleProviderSelector(): void {
    this.showProviderSelector = !this.showProviderSelector;
    console.log('Provider selector toggled to:', this.showProviderSelector);
  }

  changeProvider(providerType: MapProviderType): void {
    console.log(`Provider change requested: ${this.currentProvider} -> ${providerType}`);

    if (this.currentProvider !== providerType) {
      this.currentProvider = providerType;
      console.log('Emitting providerChange event with value:', providerType);

      // Émettre l'événement via EventEmitter Angular
      this.providerChange.emit(providerType);

      // Émettre également un événement DOM personnalisé pour une meilleure compatibilité
      this.dispatchCustomEvent(providerType);

      console.log('providerChange events emitted (Angular + Custom DOM)');
    } else {
      console.log('Provider unchanged, no event emitted');
    }
  }

  private dispatchCustomEvent(providerType: MapProviderType): void {
    try {
      // Créer et dispatcher un événement DOM personnalisé
      const event = new CustomEvent('map-provider-change', {
        bubbles: true,
        detail: { providerType }
      });

      // Dispatcher sur l'élément hôte et sur le document
      this.elementRef.nativeElement.dispatchEvent(event);
      document.dispatchEvent(event);

      console.log('Custom DOM event dispatched');
    } catch (err) {
      console.error('Error dispatching custom event:', err);
    }
  }
}
