import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DeviceSummaryResponse } from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { BadgeTone, StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { DevicesFacade } from './devices.facade';

@Component({
  selector: 'app-devices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DevicesFacade],
  imports: [ReactiveFormsModule, DatePipe, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Dispositivos (Runner Local)</h1>
        <p class="cj-muted sub">
          Vincule computadores com o <code class="cj-mono">creatingj-runner</code> para executar tarefas autorizadas.
        </p>
      </div>
      <button type="button" class="cj-btn" (click)="facade.load()" [disabled]="facade.loading()">
        Atualizar
      </button>
    </div>

    <section class="cj-card pair-card">
      <h2>Parear novo computador</h2>
      <form [formGroup]="pairForm" (ngSubmit)="submitPairing()" class="pair-grid">
        <div>
          <label for="dev-name" class="cj-label">Nome do dispositivo</label>
          <input
            id="dev-name"
            type="text"
            formControlName="deviceName"
            class="cj-input"
            placeholder="Notebook-Dev"
          />
        </div>
        <div>
          <label for="dev-platform" class="cj-label">Sistema operacional</label>
          <select id="dev-platform" formControlName="platform" class="cj-select">
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
          </select>
        </div>
        <div class="pair-action">
          <button
            type="submit"
            class="cj-btn cj-btn-primary"
            [disabled]="facade.submitting() || pairForm.invalid"
          >
            {{ facade.submitting() ? 'Gerando...' : 'Gerar código de pareamento' }}
          </button>
        </div>
      </form>
    </section>

    @if (facade.challenge(); as challenge) {
      <section class="cj-card challenge-box" role="status">
        <div class="challenge-head">
          <div>
            <strong>Código de pareamento para {{ challenge.deviceName }}</strong>
            <div class="cj-muted small">
              Expira em {{ challenge.expiresAt | date: 'dd/MM/yyyy HH:mm' }}
            </div>
          </div>
          <button type="button" class="cj-btn" (click)="facade.dismissChallenge()">Ocultar</button>
        </div>
        <div class="code-line cj-mono">
          creatingj-runner pair --code {{ challenge.pairingCode }}
        </div>
        <div class="challenge-actions">
          <button
            type="button"
            class="cj-btn cj-btn-primary"
            (click)="copy('creatingj-runner pair --code ' + challenge.pairingCode, 'Comando copiado!')"
          >
            Copiar comando do runner
          </button>
          <button
            type="button"
            class="cj-btn"
            (click)="copy(challenge.pairingCode, 'Código copiado!')"
          >
            Copiar código
          </button>
        </div>
      </section>
    }

    @if (facade.error(); as error) {
      <div class="cj-card err-box" role="alert">{{ error }}</div>
    }

    @if (facade.loading()) {
      <div class="cj-card cj-muted">Carregando dispositivos...</div>
    } @else if (facade.devices().length === 0) {
      <app-empty-state
        title="Nenhum dispositivo vinculado"
        description="Gere um código acima e execute o comando no terminal da máquina onde o creatingj-runner vai rodar."
        [showMascot]="true"
      />
    } @else {
      <div class="cj-grid cj-grid-2">
        @for (device of facade.devices(); track device.id) {
          <article class="cj-card device-card">
            <div class="device-head">
              <div>
                <strong>{{ device.name }}</strong>
                <div class="cj-muted small">{{ device.platform }} • <span class="cj-mono">{{ device.id.slice(0, 8) }}</span></div>
              </div>
              <app-status-badge [label]="presenceLabel(device)" [tone]="presenceTone(device)" />
            </div>

            <div class="cj-muted small">
              Último heartbeat:
              {{ device.lastHeartbeatAt ? (device.lastHeartbeatAt | date: 'dd/MM/yyyy HH:mm:ss') : 'ainda sem contato' }}
            </div>

            @if (device.status !== 'REVOKED') {
              <button
                type="button"
                class="cj-btn cj-btn-danger"
                [disabled]="facade.submitting()"
                (click)="confirmRevoke(device)"
              >
                Revogar acesso
              </button>
            }
          </article>
        }
      </div>
    }
  `,
  styles: `
    .sub {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
    }

    .pair-card,
    .challenge-box,
    .err-box {
      margin-bottom: 1rem;
    }

    .pair-card h2 {
      margin: 0 0 0.85rem;
      font-size: 1.1rem;
    }

    .pair-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.85rem;
      align-items: end;
    }

    .pair-action .cj-btn {
      width: 100%;
      min-height: 42px;
    }

    .challenge-box {
      border-color: rgba(56, 189, 248, 0.55);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .challenge-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .code-line {
      padding: 0.75rem;
      border-radius: var(--cj-radius-sm);
      background: var(--cj-code-bg);
      color: #e2e8f0;
      font-size: 0.86rem;
      word-break: break-all;
    }

    .challenge-actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .err-box {
      border-color: var(--cj-danger);
      color: var(--cj-danger);
    }

    .device-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .device-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .small {
      font-size: 0.82rem;
    }
  `,
})
export class DevicesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  protected readonly facade = inject(DevicesFacade);

  protected readonly pairForm = this.fb.nonNullable.group({
    deviceName: ['', [Validators.required, Validators.minLength(2)]],
    platform: ['windows', [Validators.required]],
  });

  ngOnInit(): void {
    this.facade.load();
  }

  submitPairing(): void {
    if (this.pairForm.invalid) {
      return;
    }
    const raw = this.pairForm.getRawValue();
    this.facade.createPairing({
      deviceName: raw.deviceName.trim(),
      platform: raw.platform,
    });
  }

  confirmRevoke(device: DeviceSummaryResponse): void {
    if (typeof window !== 'undefined' && !window.confirm(`Revogar o dispositivo "${device.name}"?`)) {
      return;
    }
    this.facade.revoke(device);
  }

  presenceLabel(device: DeviceSummaryResponse): string {
    if (device.status === 'REVOKED') {
      return 'Revogado';
    }
    return device.online ? 'Online' : 'Offline';
  }

  presenceTone(device: DeviceSummaryResponse): BadgeTone {
    if (device.status === 'REVOKED') {
      return 'danger';
    }
    return device.online ? 'success' : 'warning';
  }

  copy(text: string, msg: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => this.notifications.success(msg));
    }
  }
}
