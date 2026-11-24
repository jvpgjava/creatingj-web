import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthStore, sanitizeInternalReturnUrl } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuthStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sanitizes returnUrl to prevent open redirects', () => {
    expect(sanitizeInternalReturnUrl('/app/tasks')).toBe('/app/tasks');
    expect(sanitizeInternalReturnUrl('https://evil.example')).toBe('/app/chat');
    expect(sanitizeInternalReturnUrl('//evil.example')).toBe('/app/chat');
    expect(sanitizeInternalReturnUrl(null)).toBe('/app/chat');
  });

  it('logs in via web cookie endpoint and loads /auth/me without storing tokens in localStorage', async () => {
    const loginPromise = firstValueFrom(store.login('admin@creatingj.local', 'StrongPass123!'));

    const loginReq = httpMock.expectOne('/api/v1/auth/web/login');
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush({
      userId: 'u1',
      email: 'admin@creatingj.local',
      roles: ['ADMIN', 'MEMBER'],
      sessionExpiresAt: '2026-12-01T00:00:00Z',
    });

    const meReq = httpMock.expectOne('/api/v1/auth/me');
    meReq.flush({
      id: 'u1',
      email: 'admin@creatingj.local',
      displayName: 'Joao Admin',
      status: 'ACTIVE',
      roles: ['ADMIN', 'MEMBER'],
    });

    const user = await loginPromise;
    expect(user.email).toBe('admin@creatingj.local');
    expect(store.authenticated()).toBe(true);
    expect(store.isAdmin()).toBe(true);
    expect(store.user()?.roles).toContain('ADMIN');
  });

  it('handles 401 during bootstrapSession gracefully', async () => {
    const bootPromise = firstValueFrom(store.bootstrapSession());
    const req = httpMock.expectOne('/api/v1/auth/me');
    req.flush({ status: 401, detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const result = await bootPromise;
    expect(result).toBeNull();
    expect(store.initialized()).toBe(true);
    expect(store.authenticated()).toBe(false);
  });
});
