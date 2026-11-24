import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivateAccountRequest,
  ConfirmPasswordResetRequest,
  CurrentUserResponse,
  LoginRequest,
  PasswordResetRequest,
  PasswordResetRequestedResponse,
  PkceAuthorizeRequest,
  PkceAuthorizeResponse,
  SessionSummaryResponse,
  WebLoginResponse,
} from '../api/api-v1.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  webLogin(request: LoginRequest): Observable<WebLoginResponse> {
    return this.http.post<WebLoginResponse>(`${this.baseUrl}/web/login`, request);
  }

  me(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(`${this.baseUrl}/me`);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {});
  }

  listSessions(): Observable<SessionSummaryResponse[]> {
    return this.http.get<SessionSummaryResponse[]>(`${this.baseUrl}/sessions`);
  }

  revokeSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
  }

  activateAccount(request: ActivateAccountRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/activate`, request);
  }

  requestPasswordReset(request: PasswordResetRequest): Observable<PasswordResetRequestedResponse> {
    return this.http.post<PasswordResetRequestedResponse>(
      `${this.baseUrl}/password-reset/request`,
      request,
    );
  }

  confirmPasswordReset(request: ConfirmPasswordResetRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/password-reset/confirm`, request);
  }

  authorizePkce(request: PkceAuthorizeRequest): Observable<PkceAuthorizeResponse> {
    return this.http.post<PkceAuthorizeResponse>(`${this.baseUrl}/pkce/authorize`, request);
  }
}
