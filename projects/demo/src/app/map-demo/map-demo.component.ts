import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapLibModule, MapService, MapLibOptions } from 'map-lib';
import { IconService, PopupInfo } from 'map-lib';
import * as L from 'leaflet';
import { MapComponent } from 'map-lib';

@Component({
  selector: 'app-map-demo',
  standalone: true,
  imports: [CommonModule, MapLibModule],
  templateUrl: './map-demo.component.html',
  styleUrls: ['./map-demo.component.css']
})
export class MapDemoComponent implements OnInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  mapOptions: MapLibOptions = {
    center: [46.603354, 1.888334],
    zoom: 6
  };

  constructor(
    private mapService: MapService,
    private iconService: IconService
  ) { }

  ngOnInit(): void {
    this.mapService.mapReady$.subscribe(ready => {
      if (ready) {
        this.addCustomLayers();
      }
    });
  }

  addCustomLayers(): void {
    console.log('addCustomLayers');


    const parisInfo: PopupInfo = {
      title: 'Paris',
      description: 'La ville lumière, capitale de la France.',
      details: {
        'Population': '2,2 millions',
        'Altitude': '35m',
        'Superficie': '105,4 km²',
        'Fondation': '52 av. J.-C.'
      }
    };

    const marseilleInfo: PopupInfo = {
      title: 'Marseille',
      description: 'Ville portuaire du sud de la France.',
      details: {
        'Population': '870 000',
        'Altitude': '0-640m',
        'Superficie': '240,6 km²',
        'Fondation': '600 av. J.-C.'
      }
    };

    // Popup info pour Lyon
    const lyonInfo: PopupInfo = {
      title: 'Lyon',
      description: 'Capitale gastronomique de la France.',
      details: {
        'Population': '516 000',
        'Altitude': '162-305m',
        'Superficie': '47,87 km²',
        'Fondation': '43 av. J.-C.'
      }
    };

    const parisMarker = this.iconService.createMarkerWithIcon(
      [48.864716, 2.349014],
      {
        iconClass: 'fas fa-monument',
        markerColor: '#e74c3c',
        iconColor: 'red'
      },
      parisInfo
    );

    const marseilleMarker = this.iconService.createMarkerWithIcon(
      [43.296482, 5.369780],
      {
        iconClass: 'fas fa-ship',
        markerColor: '#3498db',
        iconColor: 'red'
      },
      marseilleInfo
    );

    const lyonMarker = this.iconService.createMarkerWithIcon(
      [45.764043, 4.835659],
      {
        iconClass: 'fas fa-utensils',
        markerColor: '#2ecc71',
        iconColor: 'red'
      },
      lyonInfo
    );

    const markersLayer = L.layerGroup([parisMarker, marseilleMarker, lyonMarker]);

    this.mapService.addLayer({
      id: 'cities-fa',
      name: 'Villes (Font Awesome)',
      layer: markersLayer,
      enabled: true,
      zIndex: 1
    });

    const polygon = L.polygon([
      [48.8, 2.0],
      [48.9, 2.5],
      [48.5, 2.6],
      [48.4, 2.2]
    ], { color: '#9b59b6', fillOpacity: 0.3 });

    this.mapService.addLayer({
      id: 'region',
      name: 'Région d\'exemple',
      layer: polygon,
      enabled: false,
      zIndex: 2
    });
  }
}
