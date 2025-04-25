import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map.component';
import { LayerControlComponent } from './components/layer-control/layer-control.component';
import { MapService } from './services/map.service';
import { IconService } from './services/icon.service';

@NgModule({
    imports: [
        CommonModule,
        MapComponent,
        LayerControlComponent
    ],
    exports: [
        MapComponent,
        LayerControlComponent
    ],
    providers: [
        MapService,
        IconService
    ]
})
export class MapLibModule { }
