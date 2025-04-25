import { Routes } from '@angular/router';
import { MapDemoComponent } from './map-demo/map-demo.component';

export const routes: Routes = [
    { path: 'map-demo', component: MapDemoComponent },
    { path: '', redirectTo: 'map-demo', pathMatch: 'full' }
];
