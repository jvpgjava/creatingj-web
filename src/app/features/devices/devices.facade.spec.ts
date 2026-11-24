import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DevicesFacade } from './devices.facade';

describe('DevicesFacade', () => {
  let facade: DevicesFacade;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DevicesFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    facade = TestBed.inject(DevicesFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates a pairing challenge and revokes a device', () => {
    facade.createPairing({ deviceName: 'Meu-PC', platform: 'windows' });
    httpMock.expectOne('/api/v1/devices/pairing-challenges').flush({
      challengeId: 'c1',
      pairingCode: 'PAIR-1234',
      deviceName: 'Meu-PC',
      platform: 'windows',
      expiresAt: '2026-11-24T01:00:00Z',
    });
    expect(facade.challenge()?.pairingCode).toBe('PAIR-1234');

    facade.load();
    httpMock.expectOne('/api/v1/devices').flush({
      items: [
        {
          id: 'd1',
          name: 'Meu-PC',
          platform: 'windows',
          status: 'ACTIVE',
          online: true,
          createdAt: '2026-11-24T00:00:00Z',
        },
      ],
    });

    facade.revoke(facade.devices()[0]);
    httpMock.expectOne('/api/v1/devices/d1/revoke').flush({
      id: 'd1',
      name: 'Meu-PC',
      platform: 'windows',
      status: 'REVOKED',
      online: false,
      createdAt: '2026-11-24T00:00:00Z',
      revokedAt: '2026-11-24T00:10:00Z',
    });

    expect(facade.devices()[0]?.status).toBe('REVOKED');
  });
});
