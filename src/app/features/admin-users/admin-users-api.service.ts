import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateManagedUserRequest,
  CreatedManagedUserResponse,
  UserStatus,
  UserSummaryResponse,
  UsersPageResponse,
} from '../../core/api/api-v1.models';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

  listUsers(page: number, size: number, status?: UserStatus | ''): Observable<UsersPageResponse> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<UsersPageResponse>(this.baseUrl, { params });
  }

  createUser(request: CreateManagedUserRequest): Observable<CreatedManagedUserResponse> {
    return this.http.post<CreatedManagedUserResponse>(this.baseUrl, request);
  }

  suspendUser(userId: string): Observable<UserSummaryResponse> {
    return this.http.post<UserSummaryResponse>(
      `${this.baseUrl}/${encodeURIComponent(userId)}/suspend`,
      {},
    );
  }
}
