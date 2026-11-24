import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SessionSummaryResponse } from '../../core/api/api-v1.models';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { ThemeService } from '../../core/layout/theme.service';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';

@Component({
  selector: 'app-account-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, StatusBadgeComponent],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Perfil e Segurança da Sessão</h1>
        <p class="cj-muted sub">Gerencie suas sessões ativas em navegadores, CLI, extensão e mobile.</p>
      </div>
      <button type="button" class="cj-btn" (click)="theme.toggle()">
        Tema: {{ theme.mode() === 'dark' ? 'Escuro' : 'Claro' }}
      </button>
    </div>

    @if (auth.user(); as user) {
      <section class="cj-card profile-card">
        <div class="profile-row">
          <img src="assets/creatingj-mascot.png" alt="Mascote CreatingJ" width="68" height="68" />
          <div>
            <h2>{{ user.displayName || user.email }}</h2>
            <div class="cj-muted">{{ user.email }}</div>
            <div class="badges">
              <app-status-badge [label]="user.status" tone="success" />
              @for (role of user.roles; track role) {
                <app-status-badge [label]="role" tone="info" />
              }
            </div>
          </div>
        </div>
      </section>
    }

    @if (error(); as err) {
      <div class="cj-card err-box" role="alert">{{ err }}</div>
    }

    <section class="cj-card">
      <div class="sec-head">
        <h2>Sessões ativas ({{ sessions().length }})</h2>
        <button type="button" class="cj-btn" (click)="loadSessions()" [disabled]="loading()">
          Atualizar
        </button>
      </div>

      @if (loading()) {
        <p class="cj-muted">Carregando sessões...</p>
      } @else if (sessions().length === 0) {
        <p class="cj-muted">Nenhuma sessão ativa encontrada.</p>
      } @else {
        <div class="session-list">
          @for (s of sessions(); track s.id) {
            <article class="session-row">
              <div>
                <div class="s-title">
                  <strong>{{ s.clientId || 'creatingj-web' }}</strong>
                  @if (s.id === auth.user()?.sessionId) {
                    <app-status-badge label="Sessão atual" tone="info" />
                  }
                </div>
                <div class="cj-muted small">
                  Método: {{ s.authMethod || 'COOKIE' }} • Criada em
                  {{ s.createdAt | date: 'dd/MM/yyyy HH:mm' }} • Expira em
                  {{ s.expiresAt | date: 'dd/MM/yyyy HH:mm' }}
                </div>
              </div>
              <button
                type="button"
                class="cj-btn cj-btn-danger"
                [disabled]="revoking()"
                (click)="revokeSession(s)"
              >
                Revogar
              </button>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .sub {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
    }

    .profile-card,
    .err-box {
      margin-bottom: 1rem;
    }

    .err-box {
      border-color: var(--cj-danger);
      color: var(--cj-danger);
    }

    .profile-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .profile-row h2,
    .sec-head h2 {
      margin: 0;
      font-size: 1.15rem;
    }

    .badges {
      margin-top: 0.45rem;
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .sec-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.9rem;
    }

    .session-list {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }

    .session-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.85rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
    }

    .s-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .small {
      font-size: 0.82rem;
    }
  `,
})
export class AccountSettingsComponent implements OnInit {
  private readonly api = inject(AuthApiService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);

  protected readonly loading = signal(false);
  protected readonly revoking = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sessions = signal<readonly SessionSummaryResponse[]>([]);

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listSessions().subscribe({
      next: (list) => {
        this.sessions.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(normalizeApiError(err).message);
      },
    });
  }

  revokeSession(session: SessionSummaryResponse): void {
    this.revoking.set(true);
    this.api.revokeSession(session.id).subscribe({
      next: () => {
        this.revoking.set(false);
        this.sessions.update((list) => list.filter((s) => s.id !== session.id));
        this.notifications.info('Sessão revogada.');
        if (session.id === this.auth.user()?.sessionId) {
          void this.auth.logout();
        }
      },
      error: (err: unknown) => {
        this.revoking.set(false);
        this.notifications.error(normalizeApiError(err).message);
      },
    });
  }
}
