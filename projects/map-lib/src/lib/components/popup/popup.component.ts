import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupInfo } from '../../models/popup-info.model';
import { AssetService } from '../../services/asset.service';
import * as olc from 'open-location-code';

interface DetailItem {
  label: string;
  value: string;
}

@Component({
  selector: 'lib-popup',
  templateUrl: './popup.component.html',
  styleUrls: ['./popup.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PopupComponent implements OnInit {
  @Input() popupInfo!: PopupInfo;
  @Input() latitude?: number;
  @Input() longitude?: number;

  defaultImageUrl: string = '';
  detailItems: DetailItem[] = [];

  constructor(private assetService: AssetService) { }

  ngOnInit(): void {
    this.defaultImageUrl = this.assetService.getEncodedSvgUrl(
      this.assetService.getDefaultMarkerImage()
    );
    if (this.popupInfo.details) {
      this.detailItems = Object.entries(this.popupInfo.details).map(([key, value]) => ({
        label: key,
        value: value
      }));
    }

    if (this.latitude && this.longitude) {
      try {
        const OpenLocationCode = olc.OpenLocationCode;
        const encoder = new OpenLocationCode() as any;
        const plusCode = encoder.encode(this.latitude, this.longitude);

        this.detailItems.push({
          label: 'Plus Code',
          value: plusCode
        });
      } catch (error) {
        console.error("Erreur lors de l'encodage du Plus Code:", error);
      }
    }
  }
}
