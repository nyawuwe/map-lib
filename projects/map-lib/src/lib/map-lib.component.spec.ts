import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLibComponent } from './map-lib.component';

describe('MapLibComponent', () => {
  let component: MapLibComponent;
  let fixture: ComponentFixture<MapLibComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapLibComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
