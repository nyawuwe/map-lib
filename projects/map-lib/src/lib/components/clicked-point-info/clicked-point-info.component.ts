import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import * as olc from 'open-location-code';
import { PlusCodeService } from '../../services/plus-code.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'lib-clicked-point-info',
    templateUrl: './clicked-point-info.component.html',
    styleUrls: ['./clicked-point-info.component.css'],
    standalone: true,
    imports: [CommonModule, HttpClientModule]
})
export class ClickedPointInfoComponent implements OnInit {
    @Input() latitude: number = 0;
    @Input() longitude: number = 0;
    @Input() locationName: string = 'Lieu non répertorié';

    plusCode: string = '';
    visible: boolean = false;
    loading: boolean = false;

    constructor(
        private plusCodeService: PlusCodeService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void { }

    show(lat: number, lng: number, name?: string): void {
        this.latitude = lat;
        this.longitude = lng;
        if (name) {
            this.locationName = name;
        } else {
            this.locationName = 'Lieu non répertorié';
        }
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
                this.toastService.showError("Impossible de générer le Plus Code. Veuillez réessayer.");
            }
        });
    }

    copyToClipboard(value: string): void {
        navigator.clipboard.writeText(value)
            .then(() => {
                this.toastService.showSuccess('Information copiée dans le presse-papiers');
            })
            .catch(err => {
                this.toastService.showError('Impossible de copier le texte');
                console.error('Erreur lors de la copie dans le presse-papiers:', err);
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
