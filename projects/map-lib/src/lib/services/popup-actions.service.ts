import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FavoritePlace {
    id?: string;
    title: string;
    latitude: number;
    longitude: number;
}

@Injectable({
    providedIn: 'root'
})
export class PopupActionsService {
    private favorites: FavoritePlace[] = [];
    private favoritesSubject = new BehaviorSubject<FavoritePlace[]>([]);

    constructor() {
        // Charger les favoris stockés si disponibles
        const storedFavorites = localStorage.getItem('map-favorites');
        if (storedFavorites) {
            try {
                this.favorites = JSON.parse(storedFavorites);
                this.favoritesSubject.next(this.favorites);
            } catch (e) {
                console.error('Erreur lors du chargement des favoris:', e);
            }
        }
    }

    /**
     * Obtenir la liste des favoris
     */
    getFavorites(): Observable<FavoritePlace[]> {
        return this.favoritesSubject.asObservable();
    }

    /**
     * Ajouter un lieu aux favoris
     */
    addToFavorites(place: FavoritePlace): void {
        // Générer un ID unique si non fourni
        if (!place.id) {
            place.id = Date.now().toString();
        }

        // Vérifier si le lieu existe déjà dans les favoris
        const existingIndex = this.favorites.findIndex(fav =>
            fav.latitude === place.latitude && fav.longitude === place.longitude
        );

        if (existingIndex === -1) {
            this.favorites.push(place);
            this.updateFavorites();
        }
    }

    /**
     * Supprimer un lieu des favoris
     */
    removeFromFavorites(placeId: string): void {
        this.favorites = this.favorites.filter(fav => fav.id !== placeId);
        this.updateFavorites();
    }

    /**
     * Vérifier si un lieu est dans les favoris
     */
    isFavorite(latitude: number, longitude: number): boolean {
        return this.favorites.some(fav =>
            fav.latitude === latitude && fav.longitude === longitude
        );
    }

    /**
     * Copier du texte dans le presse-papier
     */
    copyToClipboard(text: string): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                navigator.clipboard.writeText(text)
                    .then(() => resolve(true))
                    .catch(() => {
                        // Méthode alternative pour les navigateurs qui ne supportent pas l'API Clipboard
                        this.fallbackCopyToClipboard(text);
                        resolve(true);
                    });
            } catch (e) {
                console.error('Erreur lors de la copie:', e);
                resolve(false);
            }
        });
    }

    /**
     * Méthode alternative pour copier du texte
     */
    private fallbackCopyToClipboard(text: string): boolean {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }

    /**
     * Mettre à jour les favoris dans le localStorage
     */
    private updateFavorites(): void {
        this.favoritesSubject.next(this.favorites);
        localStorage.setItem('map-favorites', JSON.stringify(this.favorites));
    }
}
