import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupInfo } from '../../models/popup-info.model';
import { AssetService } from '../../services/asset.service';

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

    defaultImageUrl: string = '';
    detailItems: DetailItem[] = [];

    constructor(private assetService: AssetService) { }

    ngOnInit(): void {
        // Convertir l'SVG en URL data pour l'utiliser comme image par défaut
        this.defaultImageUrl = this.assetService.getEncodedSvgUrl(
            this.assetService.getDefaultMarkerImage()
        );

        // Transformer l'objet details en tableau pour l'affichage
        if (this.popupInfo.details) {
            this.detailItems = Object.entries(this.popupInfo.details).map(([key, value]) => ({
                label: key,
                value: value
            }));
        }
    }
}
