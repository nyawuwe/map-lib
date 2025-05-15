import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlusCodeService } from '../../services/plus-code.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'lib-clicked-point-popup',
    templateUrl: './clicked-point-popup.component.html',
    styleUrls: ['./clicked-point-popup.component.css'],
    standalone: true,
    imports: [CommonModule]
})
export class ClickedPointPopupComponent implements OnInit {
    @Input() latitude: number = 0;
    @Input() longitude: number = 0;
    @Input() locationName: string = 'Lieu non répertorié';

    plusCode: string = '';
    loading: boolean = true;

    constructor(
        private plusCodeService: PlusCodeService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadPlusCode();
    }

    private loadPlusCode(): void {
        if (this.latitude && this.longitude) {
            this.plusCodeService.getPlusCodeFromApi(this.latitude, this.longitude).subscribe({
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
}
