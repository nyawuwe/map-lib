import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map.component';
import { LayerControlComponent } from './components/layer-control/layer-control.component';
import { PopupComponent } from './components/popup/popup.component';
import { MapService } from './services/map.service';
import { IconService } from './services/icon.service';
import { PopupService } from './services/popup.service';
import { AssetService } from './services/asset.service';

@NgModule({
    imports: [
        CommonModule,
        MapComponent,
        LayerControlComponent,
        PopupComponent
    ],
    exports: [
        MapComponent,
        LayerControlComponent,
        PopupComponent
    ],
    providers: [
        MapService,
        IconService,
        PopupService,
        AssetService
    ]
})
export class MapLibModule { }
