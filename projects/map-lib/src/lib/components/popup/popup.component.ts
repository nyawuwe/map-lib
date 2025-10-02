import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupInfo } from '../../models/popup-info.model';
import { AssetService } from '../../services/asset.service';
import { PopupActionsService, FavoritePlace } from '../../services/popup-actions.service';
import * as olc from 'open-location-code';
// Phosphor icons are loaded via CDN in index.html

interface DetailItem {
  label: string;
  value: string;
  canCopy?: boolean;
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
  isFavorite: boolean = false;

  // Variables pour les notifications
  copiedMessage: string = '';
  showCopyNotification: boolean = false;

  constructor(
    private assetService: AssetService,
    private popupActionsService: PopupActionsService
  ) { }

  ngOnInit(): void {
    this.defaultImageUrl = this.assetService.getEncodedSvgUrl(
      this.assetService.getDefaultMarkerImage()
    );

    this.setupDetailItems();
    this.checkFavoriteStatus();
  }

  private setupDetailItems(): void {
    if (this.popupInfo.details) {
      this.detailItems = Object.entries(this.popupInfo.details).map(([key, value]) => ({
        label: key,
        value: value,
        canCopy: false
      }));
    }

    // Ajouter code postal si disponible
    if (this.popupInfo.postalCode) {
      this.detailItems.push({
        label: 'Code postal',
        value: this.popupInfo.postalCode,
        canCopy: true
      });
    }

    // Calculer ou utiliser le plus code si disponible
    if (this.latitude && this.longitude) {
      let plusCodeValue = this.popupInfo.plusCode;

      if (!plusCodeValue) {
        try {
          const OpenLocationCode = olc.OpenLocationCode;
          const encoder = new OpenLocationCode() as any;
          plusCodeValue = encoder.encode(this.latitude, this.longitude);
        } catch (error) {
          console.error("Erreur lors de l'encodage du Plus Code:", error);
        }
      }

      if (plusCodeValue) {
        this.detailItems.push({
          label: 'Plus code',
          value: plusCodeValue,
          canCopy: true
        });
      }

      // Ajouter position GPS
      this.detailItems.push({
        label: 'Position GPS',
        value: `${this.latitude}, ${this.longitude}`,
        canCopy: true
      });
    }
  }

  private checkFavoriteStatus(): void {
    if (this.latitude && this.longitude) {
      this.isFavorite = this.popupActionsService.isFavorite(this.latitude, this.longitude);
    }
  }

  /**
   * Copier la valeur dans le presse-papier
   */
  async copyToClipboard(text: string): Promise<void> {
    const success = await this.popupActionsService.copyToClipboard(text);

    if (success) {
      this.showCopyNotification = true;
      this.copiedMessage = 'Copié!';

      // Masquer la notification après 2 secondes
      setTimeout(() => {
        this.showCopyNotification = false;
      }, 2000);
    }
  }

  /**
   * Ajouter ou supprimer des favoris
   */
  toggleFavorite(): void {
    if (!this.latitude || !this.longitude) return;

    if (this.isFavorite) {
      // Trouver l'ID du favori puis le supprimer
      this.popupActionsService.getFavorites().subscribe(favorites => {
        const favorite = favorites.find(f =>
          f.latitude === this.latitude && f.longitude === this.longitude
        );

        if (favorite && favorite.id) {
          this.popupActionsService.removeFromFavorites(favorite.id);
          this.isFavorite = false;
        }
      });
    } else {
      // Ajouter aux favoris
      const place: FavoritePlace = {
        title: this.popupInfo.title,
        latitude: this.latitude,
        longitude: this.longitude
      };

      this.popupActionsService.addToFavorites(place);
      this.isFavorite = true;
    }
  }

  /**
   * Ouvrir l'itinéraire vers ce lieu
   */
  openDirections(): void {
    if (!this.latitude || !this.longitude) return;

    // Ouvrir Google Maps avec les coordonnées
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.latitude},${this.longitude}`;
    window.open(url, '_blank');
  }
}
