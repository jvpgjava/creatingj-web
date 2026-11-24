import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePairingChallengeRequest,
  DeviceSummaryResponse,
  DevicesResponse,
  PairingChallengeResponse,
} from '../../core/api/api-v1.models';

@Injectable({ providedIn: 'root' })
export class DevicesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/devices`;

  listDevices(): Observable<DevicesResponse> {
    return this.http.get<DevicesResponse>(this.baseUrl);
  }

  createPairingChallenge(
    request: CreatePairingChallengeRequest,
  ): Observable<PairingChallengeResponse> {
    return this.http.post<PairingChallengeResponse>(`${this.baseUrl}/pairing-challenges`, request);
  }

  revokeDevice(deviceId: string): Observable<DeviceSummaryResponse> {
    return this.http.post<DeviceSummaryResponse>(
      `${this.baseUrl}/${encodeURIComponent(deviceId)}/revoke`,
      {},
    );
  }
}
