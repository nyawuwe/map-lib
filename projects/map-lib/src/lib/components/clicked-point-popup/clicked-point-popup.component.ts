import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlusCodeService } from '../../services/plus-code.service';
import { ToastService } from '../../services/toast.service';

export interface ClickedPointButtonConfig {
  visible?: boolean;
  icon?: string;
  tooltip?: string;
  enabled?: boolean;
}

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

  // Configuration des boutons
  @Input() button1Config: ClickedPointButtonConfig = { visible: true, icon: 'ph-share-network', tooltip: 'Partager' };
  @Input() button2Config: ClickedPointButtonConfig = { visible: true, icon: 'ph-bookmark-simple', tooltip: 'Favoris' };
  @Input() button3Config: ClickedPointButtonConfig = { visible: true, icon: 'ph-path', tooltip: 'Itinéraire' };
  @Input() button4Config: ClickedPointButtonConfig = { visible: true, icon: 'ph-plus', tooltip: 'Créer adresse' };
  // Événements de clic sur les boutons
  @Output() button1Click = new EventEmitter<{ lat: number, lng: number }>();
  @Output() button2Click = new EventEmitter<{ lat: number, lng: number }>();
  @Output() button3Click = new EventEmitter<{ lat: number, lng: number }>();
  @Output() button4Click = new EventEmitter<{ lat: number, lng: number }>();

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

  onButton1Click(): void {
    this.button1Click.emit({ lat: this.latitude, lng: this.longitude });
  }

  onButton2Click(): void {
    this.button2Click.emit({ lat: this.latitude, lng: this.longitude });
  }

  onButton3Click(): void {
    this.button3Click.emit({ lat: this.latitude, lng: this.longitude });
  }

  onButton4Click(): void {
    this.button4Click.emit({ lat: this.latitude, lng: this.longitude });
  }
}
