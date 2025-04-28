import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as olc from 'open-location-code';

@Component({
  selector: 'lib-plus-code-card',
  template: `
    <div class="plus-code-container" [class.visible]="visible" [class.loading]="loading">
      <div class="plus-code-card">
        <div class="loading-spinner" *ngIf="loading"></div>
        <div class="plus-code-content" *ngIf="!loading">
          <h3>Votre position</h3>
          <div class="plus-code">{{ plusCode }}</div>
          <div class="coordinates">
            <span>Lat: {{ latitude | number:'1.6-6' }}</span>
            <span>Lng: {{ longitude | number:'1.6-6' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .plus-code-container {
      position: absolute;
      left: 20px;
      bottom: 20px;
      right: auto;
      top: auto;
      z-index: 1000;
      visibility: hidden;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      max-width: 300px;
      overflow: visible;
    }

    .plus-code-container.visible {
      visibility: visible;
      opacity: 1;
      transform: translateY(0);
    }

    .plus-code-card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 20px;
      min-width: 200px;
      min-height: 160px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .plus-code-content {
      text-align: center;
      width: 100%;
    }

    h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .plus-code {
      font-size: 20px;
      font-weight: bold;
      color: #2196F3;
      margin-bottom: 16px;
      padding: 10px;
      background-color: #f5f8ff;
      border-radius: 8px;
      border: 1px solid #e3eaff;
      word-break: break-all;
    }

    .coordinates {
      display: flex;
      flex-direction: column;
      font-size: 12px;
      color: #666;
      gap: 4px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(33, 150, 243, 0.1);
      border-radius: 50%;
      border-top-color: #2196F3;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class PlusCodeCardComponent implements OnInit {
  @Input() latitude: number = 0;
  @Input() longitude: number = 0;

  plusCode: string = '';
  visible: boolean = false;
  loading: boolean = false;

  ngOnInit(): void { }

  show(lat: number, lng: number): void {
    this.latitude = lat;
    this.longitude = lng;
    this.loading = true;
    this.visible = true;

    // Simuler un temps de chargement pour l'effet visuel
    setTimeout(() => {
      try {
        // Contourner le problème de typage en utilisant une approche plus directe
        // La classe OpenLocationCode est disponible à l'exécution mais les types TypeScript ne correspondent pas
        const OpenLocationCode = olc.OpenLocationCode;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const encoder = new OpenLocationCode() as any;
        this.plusCode = encoder.encode(lat, lng);
      } catch (error) {
        console.error("Erreur lors de l'encodage du Plus Code:", error);
        this.plusCode = "Erreur d'encodage";
      }
      this.loading = false;
    }, 1500);
  }

  hide(): void {
    this.visible = false;
  }

  toggle(lat: number, lng: number): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show(lat, lng);
    }
  }
}
