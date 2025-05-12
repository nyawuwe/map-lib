import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import * as olc from 'open-location-code';
import { PlusCodeService } from '../../services/plus-code.service';

@Component({
  selector: 'lib-plus-code-card',
  templateUrl: './plus-code-card.component.html',
  styleUrls: ['./plus-code-card.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule]
})
export class PlusCodeCardComponent implements OnInit {
  @Input() latitude: number = 0;
  @Input() longitude: number = 0;

  plusCode: string = '';
  visible: boolean = false;
  loading: boolean = false;

  constructor(private plusCodeService: PlusCodeService) { }

  ngOnInit(): void { }

  show(lat: number, lng: number): void {
    this.latitude = lat;
    this.longitude = lng;
    this.loading = true;
    this.visible = true;

    this.plusCodeService.getPlusCodeFromApi(lat, lng).subscribe({
      next: (code) => {
        this.plusCode = code;
        this.loading = false;
      },
      error: () => {
        this.plusCode = "Erreur d'encodage";
        this.loading = false;
      }
    });
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
