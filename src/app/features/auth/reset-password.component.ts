import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="cj-card auth-card">
        <div class="auth-hero">
          <img src="assets/creatingj-mascot.png" alt="Mascote CreatingJ" width="88" height="88" />
          <h1>Redefinir senha</h1>
        </div>

        <div class="tabs" role="tablist">
          <button
            type="button"
            class="cj-btn"
            [class.cj-btn-primary]="mode() === 'request'"
            (click)="mode.set('request')"
          >
            1. Solicitar token
          </button>
          <button
            type="button"
            class="cj-btn"
            [class.cj-btn-primary]="mode() === 'confirm'"
            (click)="mode.set('confirm')"
          >
            2. Confirmar nova senha
          </button>
        </div>

        @if (errorMessage(); as error) {
          <div class="auth-alert" role="alert">{{ error }}</div>
        }

        @if (infoMessage(); as info) {
          <div class="auth-info" role="status">{{ info }}</div>
        }

        @if (mode() === 'request') {
          <form [formGroup]="requestForm" (ngSubmit)="submitRequest()" class="auth-form">
            <div>
              <label for="reset-email" class="cj-label">E-mail da conta</label>
              <input
                id="reset-email"
                type="email"
                formControlName="email"
                class="cj-input"
                placeholder="voce@empresa.com"
              />
            </div>
            <button
              type="submit"
              class="cj-btn cj-btn-primary auth-submit"
              [disabled]="submitting() || requestForm.invalid"
            >
              {{ submitting() ? 'Enviando...' : 'Solicitar redefinição' }}
            </button>
          </form>
        } @else {
          <form [formGroup]="confirmForm" (ngSubmit)="submitConfirm()" class="auth-form">
            <div>
              <label for="reset-token" class="cj-label">Token de recuperação</label>
              <input
                id="reset-token"
                type="text"
                formControlName="token"
                class="cj-input cj-mono"
                placeholder="Token recebido"
              />
            </div>
            <div>
              <label for="new-password" class="cj-label">Nova senha (mín. 12 caracteres)</label>
              <input
                id="new-password"
                type="password"
                formControlName="newPassword"
                class="cj-input"
                autocomplete="new-password"
              />
            </div>
            <button
              type="submit"
              class="cj-btn cj-btn-primary auth-submit"
              [disabled]="submitting() || confirmForm.invalid"
            >
              {{ submitting() ? 'Atualizando...' : 'Atualizar senha' }}
            </button>
          </form>
        }

        <div class="back-link">
          <a routerLink="/login">Voltar para o login</a>
        </div>
      </section>
    </main>
  `,
  styles: `
    .auth-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.25rem;
    }

    .auth-card {
      width: 100%;
      max-width: 450px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.75rem;
    }

    .auth-hero {
      text-align: center;
    }

    h1 {
      margin: 0.35rem 0 0;
      font-size: 1.45rem;
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .auth-submit {
      min-height: 46px;
      width: 100%;
    }

    .auth-alert {
      padding: 0.75rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.12);
      color: var(--cj-danger);
      font-size: 0.88rem;
    }

    .auth-info {
      padding: 0.75rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid rgba(56, 189, 248, 0.45);
      background: rgba(56, 189, 248, 0.12);
      font-size: 0.88rem;
    }

    .back-link {
      text-align: center;
      font-size: 0.88rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cj-border);
    }
  `,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly mode = signal<'request' | 'confirm'>('request');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);

  protected readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly confirmForm = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(12)]],
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
  });

  submitRequest(): void {
    if (this.requestForm.invalid || this.submitting()) {
      return;
    }
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.submitting.set(true);

    this.api.requestPasswordReset(this.requestForm.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.infoMessage.set(res.message);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(normalizeApiError(err).message);
      },
    });
  }

  submitConfirm(): void {
    if (this.confirmForm.invalid || this.submitting()) {
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);

    this.api.confirmPasswordReset(this.confirmForm.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success('Senha atualizada com sucesso!');
        void this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(normalizeApiError(err).message);
      },
    });
  }
}
