import { TestBed } from '@angular/core/testing';

import { MapLibService } from './map-lib.service';

describe('MapLibService', () => {
  let service: MapLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
