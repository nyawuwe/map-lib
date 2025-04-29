import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as olc from 'open-location-code';

@Component({
  selector: 'lib-plus-code-card',
  templateUrl: './plus-code-card.component.html',
  styleUrls: ['./plus-code-card.component.css'],
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

    setTimeout(() => {
      try {
        const OpenLocationCode = olc.OpenLocationCode;
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
