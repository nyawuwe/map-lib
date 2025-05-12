import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MapLibModule, MapLibOptions } from 'map-lib';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MapLibModule, HttpClientModule],
  template: `
    <div class="container">
      <header>
        <h1>Démo de Map-Lib</h1>
        <nav>
          <a [routerLink]="['/']">Accueil</a> |
          <a [routerLink]="['/map-demo']">Exemple avancé</a>
        </nav>
      </header>

      <div class="map-section">
        <h2>Carte de base</h2>
        <div class="map-wrapper">
          <lib-map [options]="mapOptions"></lib-map>
        </div>
      </div>

      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .container {
      padding: 1rem;
      font-family: Arial, sans-serif;
    }
    header {
      margin-bottom: 2rem;
    }
    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }
    nav {
      margin-bottom: 1rem;
    }
    nav a {
      color: #3498db;
      text-decoration: none;
      margin-right: 0.5rem;
    }
    nav a:hover {
      text-decoration: underline;
    }
    .map-section {
      margin-bottom: 2rem;
    }
    .map-wrapper {
      height: 400px;
      position: relative;
      border: 1px solid #ccc;
      border-radius: 4px;
      overflow: hidden;
    }
  `]
})
export class AppComponent {
  title = 'demo';

  mapOptions: MapLibOptions = {
    center: [48.864716, 2.349014],
    zoom: 8,
    maxZoom: 18,
    minZoom: 3
  };
}
