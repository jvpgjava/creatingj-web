import { Injectable, inject, signal } from '@angular/core';
import {
  CreatePairingChallengeRequest,
  DeviceSummaryResponse,
  PairingChallengeResponse,
} from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { DevicesApiService } from './devices-api.service';

@Injectable()
export class DevicesFacade {
  private readonly api = inject(DevicesApiService);
  private readonly notifications = inject(NotificationService);

  private readonly devicesSignal = signal<readonly DeviceSummaryResponse[]>([]);
  private readonly challengeSignal = signal<PairingChallengeResponse | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly submittingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly devices = this.devicesSignal.asReadonly();
  readonly challenge = this.challengeSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly submitting = this.submittingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.listDevices().subscribe({
      next: (res) => {
        this.devicesSignal.set(res.items);
        this.loadingSignal.set(false);
      },
      error: (err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  createPairing(request: CreatePairingChallengeRequest): void {
    this.submittingSignal.set(true);
    this.errorSignal.set(null);

    this.api.createPairingChallenge(request).subscribe({
      next: (res) => {
        this.submittingSignal.set(false);
        this.challengeSignal.set(res);
        this.notifications.success('Código de pareamento gerado.');
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  revoke(device: DeviceSummaryResponse): void {
    this.submittingSignal.set(true);
    this.api.revokeDevice(device.id).subscribe({
      next: (updated) => {
        this.submittingSignal.set(false);
        this.devicesSignal.update((list) =>
          list.map((d) => (d.id === updated.id ? updated : d)),
        );
        this.notifications.warning(`Dispositivo "${updated.name}" revogado.`);
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.notifications.error(normalizeApiError(err).message);
      },
    });
  }

  dismissChallenge(): void {
    this.challengeSignal.set(null);
  }
}
