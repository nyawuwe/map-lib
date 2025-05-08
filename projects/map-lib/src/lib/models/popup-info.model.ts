export interface PopupInfo {
    title: string;
    description?: string;
    imageSrc?: string;
    imageAlt?: string;
    details?: { [key: string]: string };
    certified?: boolean;
    postalCode?: string;
    plusCode?: string;
    gpsPosition?: {
        latitude: number;
        longitude: number;
    };
}
