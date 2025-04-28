import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map.component';
import { LayerControlComponent } from './components/layer-control/layer-control.component';
import { PopupComponent } from './components/popup/popup.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';
import { PlusCodeCardComponent } from './components/plus-code-card/plus-code-card.component';
import { MapService } from './services/map.service';
import { IconService } from './services/icon.service';
import { PopupService } from './services/popup.service';
import { AssetService } from './services/asset.service';

@NgModule({
    imports: [
        CommonModule,
        MapComponent,
        LayerControlComponent,
        PopupComponent,
        MapControlsComponent,
        PlusCodeCardComponent
    ],
    exports: [
        MapComponent,
        LayerControlComponent,
        PopupComponent,
        MapControlsComponent,
        PlusCodeCardComponent
    ],
    providers: [
        MapService,
        IconService,
        PopupService,
        AssetService
    ]
})
export class MapLibModule { }
