import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adminGuard, authGuard } from './auth.guards';

describe('auth guards', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('redirects unauthenticated users to /login with returnUrl', async () => {
    const result$ = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/app/projects' } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;

    const promise = firstValueFrom(result$);
    httpMock
      .expectOne('/api/v1/auth/me')
      .flush({ status: 401 }, { status: 401, statusText: 'Unauthorized' });

    const decision = await promise;
    expect(decision instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(decision as UrlTree)).toBe('/login?returnUrl=%2Fapp%2Fprojects');
  });

  it('blocks MEMBER users from /admin routes', async () => {
    const result$ = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin/users' } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;

    const promise = firstValueFrom(result$);
    httpMock.expectOne('/api/v1/auth/me').flush({
      id: 'u2',
      email: 'member@creatingj.local',
      displayName: 'Member',
      status: 'ACTIVE',
      roles: ['MEMBER'],
    });

    const decision = await promise;
    expect(decision instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(decision as UrlTree)).toBe('/app/chat');
  });
});
