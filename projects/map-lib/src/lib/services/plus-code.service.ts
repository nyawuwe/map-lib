import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as olc from 'open-location-code';

export interface PlusCodeRequest {
  latitude: number;
  longitude: number;
  codeLength?: number;
}

export interface PlusCodeResponse {
  plusCode: string;
}

export const PLUS_CODE_API_URL = new InjectionToken<string>('PLUS_CODE_API_URL');
const DEFAULT_PLUS_CODE_URL = 'http://localhost:9001/api/v1/public/address-manager/plus-code/encode';

@Injectable({
  providedIn: 'root'
})
export class PlusCodeService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    @Optional() @Inject(PLUS_CODE_API_URL) private configuredApiUrl: string
  ) {
    this.apiUrl = this.configuredApiUrl || DEFAULT_PLUS_CODE_URL;
  }

  /**
   * Encode les coordonnées en plus-code en utilisant l'API externe
   */
  getPlusCodeFromApi(lat: number, lng: number, codeLength: number = 11): Observable<string> {
    const payload: PlusCodeRequest = {
      latitude: lat,
      longitude: lng,
      codeLength: codeLength
    };

    return this.http.post<PlusCodeResponse>(this.apiUrl, payload).pipe(
      map(response => response.plusCode),
      catchError(error => {
        console.error('Erreur lors de la récupération du plus-code depuis l\'API:', error);
        return this.getPlusCodeLocally(lat, lng);
      })
    );
  }

  /**
   * Encode les coordonnées en plus-code localement (fallback)
   */
  getPlusCodeLocally(lat: number, lng: number): Observable<string> {
    try {
      console.log('Encodage local du Plus Code...');
      const OpenLocationCode = olc.OpenLocationCode;
      const encoder = new OpenLocationCode() as any;
      const plusCode = encoder.encode(lat, lng);
      return of(plusCode);
    } catch (error) {
      console.error("Erreur lors de l'encodage local du Plus Code:", error);
      return of("Erreur d'encodage");
    }
  }
}
