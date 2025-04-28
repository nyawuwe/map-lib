import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MapComponent } from './components/map/map.component';
import { LayerControlComponent } from './components/layer-control/layer-control.component';
import { PopupComponent } from './components/popup/popup.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';
import { PlusCodeCardComponent } from './components/plus-code-card/plus-code-card.component';
import { PlacesSearchComponent } from './components/places-search/places-search.component';
import { MapService } from './services/map.service';
import { IconService } from './services/icon.service';
import { PopupService } from './services/popup.service';
import { AssetService } from './services/asset.service';
import { PlacesService, GOOGLE_PLACES_API_KEY } from './services/places.service';
import { MAP_LIB_CONFIG, MapLibConfig } from './services/map-config.service';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    MapComponent,
    LayerControlComponent,
    PopupComponent,
    MapControlsComponent,
    PlusCodeCardComponent,
    PlacesSearchComponent
  ],
  exports: [
    MapComponent,
    LayerControlComponent,
    PopupComponent,
    MapControlsComponent,
    PlusCodeCardComponent,
    PlacesSearchComponent
  ],
  providers: [
    MapService,
    IconService,
    PopupService,
    AssetService,
    PlacesService
  ]
})
export class MapLibModule {
  static forRoot(config: MapLibConfig = {}, googlePlacesApiKey?: string): ModuleWithProviders<MapLibModule> {
    return {
      ngModule: MapLibModule,
      providers: [
        { provide: MAP_LIB_CONFIG, useValue: config },
        ...(googlePlacesApiKey ? [{ provide: GOOGLE_PLACES_API_KEY, useValue: googlePlacesApiKey }] : [])
      ]
    };
  }
}
