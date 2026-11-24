import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminUsageOverviewResponse,
  UpdateUserQuotaRequest,
  UsageSummaryResponse,
  UserQuotaResponse,
} from '../../core/api/api-v1.models';

@Injectable({ providedIn: 'root' })
export class UsageApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getMyUsage(): Observable<UsageSummaryResponse> {
    return this.http.get<UsageSummaryResponse>(`${this.baseUrl}/usage/me`);
  }

  getAdminOverview(): Observable<AdminUsageOverviewResponse> {
    return this.http.get<AdminUsageOverviewResponse>(`${this.baseUrl}/admin/usage`);
  }

  updateUserQuota(
    userId: string,
    request: UpdateUserQuotaRequest,
  ): Observable<UserQuotaResponse> {
    return this.http.put<UserQuotaResponse>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/quota`,
      request,
    );
  }
}
