import { Component, OnInit, Output, EventEmitter, ViewEncapsulation, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { MapLayer } from '../../models/layer.model';
import { MapProviderType } from '../../models/map-provider.model';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'lib-layer-control',
  templateUrl: './layer-control.component.html',
  styleUrls: ['./layer-control.component.css'],
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

    this.ensureFontAwesomeIsLoaded();

    this.renderer.listen('document', 'click', (event: Event) => {
      const target = event.target as HTMLElement;
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
