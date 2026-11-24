import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';

@Component({
  selector: 'app-activate-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="cj-card auth-card">
        <div class="auth-hero">
          <img src="assets/creatingj-mascot.png" alt="Mascote CreatingJ" width="96" height="96" />
          <h1>Ativar conta</h1>
          <p class="cj-muted">Informe o token de convite recebido do administrador e defina sua senha.</p>
        </div>

        @if (errorMessage(); as error) {
          <div class="auth-alert" role="alert">{{ error }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="auth-form">
          <div>
            <label for="token" class="cj-label">Token de ativação</label>
            <input
              id="token"
              type="text"
              formControlName="token"
              class="cj-input cj-mono"
              placeholder="Cole o token de convite"
            />
          </div>

          <div>
            <label for="password" class="cj-label">Nova senha (mín. 12 caracteres)</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="cj-input"
              autocomplete="new-password"
              placeholder="Crie uma senha forte"
            />
          </div>

          <button
            type="submit"
            class="cj-btn cj-btn-primary auth-submit"
            [disabled]="submitting() || form.invalid"
          >
            {{ submitting() ? 'Ativando...' : 'Ativar minha conta' }}
          </button>
        </form>

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
      max-width: 440px;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      padding: 1.75rem;
    }

    .auth-hero {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
    }

    h1 {
      margin: 0.2rem 0 0;
      font-size: 1.5rem;
    }

    p {
      margin: 0;
      font-size: 0.88rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
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

    .back-link {
      text-align: center;
      font-size: 0.88rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cj-border);
    }
  `,
})
export class ActivateAccountComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(12)]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.form.controls.token.setValue(token);
    }
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);

    this.api.activateAccount(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success('Conta ativada com sucesso! Faça login para continuar.');
        void this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(normalizeApiError(err).message);
      },
    });
  }
}
