import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MapLibModule, MapService, MapLibOptions } from 'map-lib';
import { IconService, PopupInfo } from 'map-lib';
import { PopupActionsService } from 'map-lib';
import * as L from 'leaflet';
import { MapComponent, MapClickEvent, ClickedPointPopupConfig, ClickedPointEvent } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  standalone: true,
  imports: [CommonModule, MapLibModule, HttpClientModule],
  templateUrl: './map-demo.component.html',
  styleUrls: ['./map-demo.component.css']
})
export class MapDemoComponent implements OnInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  mapOptions: MapLibOptions = {
    center: [6.134106, 1.216633], // Centre de la carte
    zoom: 10
  };

  constructor(
    private mapService: MapService,
    private iconService: IconService,
    private popupActionsService: PopupActionsService
  ) { }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.addDemoMarkers();
      }
    });
  }

  addDemoMarkers(): void {
    // Créer une collection de marqueurs démontrant différentes fonctionnalités

    // 1. Marqueur standard avec icône Phosphor
    const standardMarker = this.iconService.createMarkerWithIcon(
      [6.134106, 1.216633],
      {
        iconClass: 'ph ph-map-pin',
        markerColor: '#e74c3c',
        iconColor: 'bleu'
      },
      {
        title: 'Marqueur Standard',
        description: 'Un marqueur de base avec une icône Phosphor',
        certified: true,
        details: {
          'Type': 'Standard',
          'Bibliothèque': 'Phosphor Icons'
        }
      }
    );

    // 2. Marqueur avec icône pleine (fill)
    const fillMarker = this.iconService.createMarkerWithIcon(
      [6.154106, 1.236633],
      {
        iconClass: 'ph-fill ph-map-pin', // Utilise l'icône en style "fill"
        markerColor: '#3498db',
        iconColor: 'bleu'
      },
      {
        title: 'Style Fill',
        description: 'Ce marqueur utilise une icône pleine',
        certified: false,
        details: {
          'Type': 'Fill',
          'Bibliothèque': 'Phosphor Icons'
        }
      }
    );

    // 3. Marqueur avec icône de bâtiment
    const buildingMarker = this.iconService.createMarkerWithIcon(
      [6.124106, 1.226633],
      {
        imageUrl: './assets/000ef536ad908ee07094dbca01432768615fd2b9.png'
      },
      {
        title: 'Bâtiment',
        imageSrc: 'https://th.bing.com/th/id/R.164954a26f537498266eb0cbc8f58f0c?rik=rE8tTf9%2bHMHfOQ&pid=ImgRaw&r=0',
        description: 'Marqueur représentant un bâtiment',
        certified: true,
        postalCode: 'LG67',
        plusCode: '6FR923KF+PV',
        details: {
          'Altitude': '25m',
          'Catégorie': 'Bâtiment public'
        }
      }
    );

    // 4. Marqueur avec icône de restaurant
    const restaurantMarker = this.iconService.createMarkerWithIcon(
      [6.144106, 1.206633],
      {
        iconClass: 'ph ph-coffee', // Icône de café/restaurant
        markerColor: '#f39c12',
        iconColor: 'bleu'
      },
      {
        title: 'Restaurant',
        imageSrc: 'https://th.bing.com/th/id/R.164954a26f537498266eb0cbc8f58f0c?rik=rE8tTf9%2bHMHfOQ&pid=ImgRaw&r=0',
        description: 'Un restaurant local avec des spécialités',
        certified: false,
        details: {
          'Catégorie': 'Restaurant',
          'Horaires': '8h - 22h',
          'Spécialité': 'Cuisine locale'
        }
      }
    );

    // 5. Marqueur avec icône de point d'intérêt
    const poiMarker = this.iconService.createMarkerWithIcon(
      [6.114106, 1.196633],
      {
        iconClass: 'ph ph-tree', // Icône d'arbre pour un parc
        markerColor: '#9b59b6',
        iconColor: 'bleu'
      },
      {
        title: 'Parc National',
        imageSrc: 'https://th.bing.com/th/id/R.164954a26f537498266eb0cbc8f58f0c?rik=rE8tTf9%2bHMHfOQ&pid=ImgRaw&r=0',
        description: 'Un espace naturel protégé',
        certified: true,
        details: {
          'Superficie': '120 hectares',
          'Faune': 'Diversifiée',
          'Activités': 'Randonnée, Observation'
        }
      }
    );

    // 6. Marqueur avec icône de transport
    const transportMarker = this.iconService.createMarkerWithIcon(
      [6.164106, 1.246633],
      {
        iconClass: 'ph ph-bus', // Icône de bus
        markerColor: '#34495e',
        iconColor: 'bleu'
      },
      {
        title: 'Station de Bus',
        imageSrc: 'https://th.bing.com/th/id/R.164954a26f537498266eb0cbc8f58f0c?rik=rE8tTf9%2bHMHfOQ&pid=ImgRaw&r=0',
        description: 'Station principale de transport en commun',
        certified: false,
        details: {
          'Lignes': '12, 15, 23',
          'Fréquence': 'Toutes les 15 min',
          'Premier départ': '5h30'
        }
      }
    );

    // Regrouper tous les marqueurs dans une couche
    const markersLayer = L.layerGroup([
      standardMarker,
      fillMarker,
      buildingMarker,
      restaurantMarker,
      poiMarker,
      transportMarker
    ]);

    // Ajouter la couche à la carte
    this.mapService.addLayer({
      id: 'demo-markers',
      name: 'Marqueurs de démonstration',
      layer: markersLayer,
      enabled: true,
      zIndex: 1
    });
  }

  /**
   * Affiche tous les lieux favoris sur la carte
   */
  showAllFavorites(): void {
    if (this.mapComponent) {
      this.mapComponent.showAllFavorites();
    }
  }

  /**
   * Ajoute un marqueur personnalisé à la position actuelle
   */
  addCurrentPositionMarker(): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (this.mapComponent && this.mapComponent.map) {
          // Utiliser une icône Phosphor pour le marqueur de position
          const positionMarker = this.iconService.createMarkerWithIcon(
            [lat, lng],
            {
              iconClass: 'ph-fill ph-user', // Icône d'utilisateur en style fill
              markerColor: '#e74c3c',
              iconColor: 'bleu'
            },
            {
              title: 'Ma position',
              imageSrc: 'https://th.bing.com/th/id/R.164954a26f537498266eb0cbc8f58f0c?rik=rE8tTf9%2bHMHfOQ&pid=ImgRaw&r=0',
              description: 'Votre position actuelle',
              certified: false,
              details: {
                'Précision': `${position.coords.accuracy} mètres`,
                'Horodatage': new Date(position.timestamp).toLocaleString(),
                'Altitude': position.coords.altitude ? `${position.coords.altitude} m` : 'Non disponible'
              }
            }
          );

          // Ajouter le marqueur à la carte
          if (this.mapComponent.map instanceof L.Map) {
            positionMarker.addTo(this.mapComponent.map);
            this.mapComponent.map.setView([lat, lng], 15);
            positionMarker.openPopup();
          }
        }
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        alert('Impossible d\'obtenir votre position actuelle.');
      }
    );
  }

  clickedPointConfig: ClickedPointPopupConfig = {
    button1: {
      visible: true,
      icon: 'ph-share',
      tooltip: 'Partager cette position'
    },
    button2: {
      visible: true,
      icon: 'ph-bookmark-simple',
      tooltip: 'Obtenir un itinéraire'
    },
    button3: {
      visible: true,
      icon: 'ph-plus',
      tooltip: 'Ajouter aux favoris'
    }
  };

  onButtonClick(event: ClickedPointEvent): void {
    const { buttonIndex, latitude, longitude } = event;

    if (buttonIndex === 1) {
      // Partager la position
    } else if (buttonIndex === 2) {
      // Obtenir un itinéraire
    } else if (buttonIndex === 3) {
      console.log('Plus')
    }
  }

  onMapClick(event: MapClickEvent): void {
    const { latitude, longitude, plusCode } = event;

    console.log(`Position cliquée: ${latitude}, ${longitude}`);
    console.log(`Plus Code: ${plusCode}`);

    // Vous pouvez maintenant utiliser ces informations comme vous le souhaitez
    // Par exemple, les stocker dans votre application ou les envoyer à un serveur
  }

}
