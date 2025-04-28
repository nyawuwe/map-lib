/**
 * Interface pour représenter les informations minimales d'une couche
 * lors du changement de fournisseur de carte
 */
export interface LayerInfo {
    id: string;
    name: string;
    enabled: boolean;
    type?: string;
    zIndex?: number;
}
