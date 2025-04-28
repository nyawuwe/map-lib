import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { MapLayer } from '../../models/layer.model';

@Component({
  selector: 'lib-layer-control',
  template: `
    <div class="layer-control">
      <div class="layer-title">Couches</div>
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
    .layer-title {
      font-weight: bold;
      margin-bottom: 8px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
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
  imports: [CommonModule]
})
export class LayerControlComponent implements OnInit {
  layers: MapLayer[] = [];

  constructor(private mapService: MapService) { }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.loadLayers();
      }
    });
  }

  loadLayers(): void {
    this.layers = this.mapService.getLayers();
  }

  toggleLayer(layerId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.mapService.toggleLayer(layerId, target.checked);
  }
}
