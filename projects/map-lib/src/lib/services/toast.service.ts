import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: Toast[] = [];
  private toastSubject = new Subject<Toast[]>();
  private counter = 0;

  constructor() { }

  /**
   * Récupérer le flux d'observables des toasts
   */
  getToasts(): Observable<Toast[]> {
    return this.toastSubject.asObservable();
  }

  /**
   * Afficher un toast standard (type info)
   */
  showToast(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }

  /**
   * Afficher un toast de succès
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }

  /**
   * Afficher un toast d'erreur
   */
  showError(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  /**
   * Afficher un toast d'avertissement
   */
  showWarning(message: string, duration: number = 4000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Afficher un toast avec un type et une durée spécifiés
   */
  private show(message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number): void {
    const id = ++this.counter;

    // Ajouter le toast à la liste
    const toast: Toast = { id, message, type, duration };
    this.toasts.push(toast);

    // Émettre la liste mise à jour
    this.toastSubject.next([...this.toasts]);

    // Supprimer automatiquement le toast après la durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  /**
   * Supprimer un toast spécifique
   */
  remove(id: number): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.toastSubject.next([...this.toasts]);
  }

  /**
   * Supprimer tous les toasts
   */
  clear(): void {
    this.toasts = [];
    this.toastSubject.next([]);
  }
}
