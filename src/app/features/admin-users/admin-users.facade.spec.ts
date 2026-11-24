import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdminUsersFacade } from './admin-users.facade';

describe('AdminUsersFacade', () => {
  let facade: AdminUsersFacade;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminUsersFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    facade = TestBed.inject(AdminUsersFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads users, filters client-side, and creates a managed user with activation token', () => {
    facade.load(0);
    httpMock.expectOne('/api/v1/admin/users?page=0&size=20').flush({
      items: [
        {
          id: 'u1',
          email: 'ana@creatingj.dev',
          displayName: 'Ana Dev',
          status: 'ACTIVE',
          roles: ['MEMBER'],
          createdAt: '2026-11-23T00:00:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
    });

    expect(facade.filteredUsers().length).toBe(1);
    facade.setSearch('inexistente');
    expect(facade.filteredUsers().length).toBe(0);
    facade.setSearch('');

    facade.createUser({
      email: 'carlos@creatingj.dev',
      displayName: 'Carlos',
      roles: ['MEMBER'],
    });

    const createReq = httpMock.expectOne('/api/v1/admin/users');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({
      user: {
        id: 'u2',
        email: 'carlos@creatingj.dev',
        displayName: 'Carlos',
        status: 'PENDING_ACTIVATION',
        roles: ['MEMBER'],
        createdAt: '2026-11-23T01:00:00Z',
      },
      activationToken: 'tok_activate_123456',
      activationExpiresAt: '2026-11-24T01:00:00Z',
    });

    httpMock.expectOne('/api/v1/admin/users?page=0&size=20').flush({
      items: [],
      page: 0,
      size: 20,
      totalElements: 2,
    });

    expect(facade.lastInvite()?.activationToken).toBe('tok_activate_123456');
  });

  it('suspends a user and updates the list state', () => {
    facade.load(0);
    httpMock.expectOne('/api/v1/admin/users?page=0&size=20').flush({
      items: [
        {
          id: 'u9',
          email: 'dev@creatingj.dev',
          displayName: 'Dev',
          status: 'ACTIVE',
          roles: ['MEMBER'],
          createdAt: '2026-11-23T00:00:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
    });

    facade.suspendUser('u9');
    const req = httpMock.expectOne('/api/v1/admin/users/u9/suspend');
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'u9',
      email: 'dev@creatingj.dev',
      displayName: 'Dev',
      status: 'SUSPENDED',
      roles: ['MEMBER'],
      createdAt: '2026-11-23T00:00:00Z',
      suspendedAt: '2026-11-23T02:00:00Z',
    });

    expect(facade.filteredUsers()[0]?.status).toBe('SUSPENDED');
  });
});
