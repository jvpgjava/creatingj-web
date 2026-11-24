import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiCredentialsInterceptor } from './api-http.interceptors';

describe('apiCredentialsInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=csrf-secret-123; path=/';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiCredentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
  });

  it('sets withCredentials and X-XSRF-TOKEN on API mutations', () => {
    http.post('/api/v1/projects', { name: 'Demo', slug: 'demo' }).subscribe();
    const req = httpMock.expectOne('/api/v1/projects');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-secret-123');
    req.flush({});
  });

  it('does not attach X-XSRF-TOKEN on GET requests', () => {
    http.get('/api/v1/system/status').subscribe();
    const req = httpMock.expectOne('/api/v1/system/status');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    req.flush({});
  });
});
