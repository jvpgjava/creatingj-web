import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore, sanitizeInternalReturnUrl } from '../../core/auth/auth.store';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { ThemeService } from '../../core/layout/theme.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <div class="top-action">
        <button type="button" class="cj-btn" (click)="theme.toggle()">
          {{ theme.mode() === 'dark' ? '☀ Tema claro' : '☾ Tema escuro' }}
        </button>
      </div>

      <section class="cj-card auth-card" aria-labelledby="login-heading">
        <div class="auth-hero">
          <img
            src="assets/creatingj-mascot.png"
            alt="Mascote 3D CreatingJ"
            class="auth-mascot"
            width="124"
            height="124"
          />
          <h1 id="login-heading">CreatingJ</h1>
          <p class="auth-tagline">Não existe limite para sua imaginação.</p>
        </div>

        @if (errorMessage(); as error) {
          <div class="auth-alert" role="alert">{{ error }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="auth-form">
          <div>
            <label for="email" class="cj-label">E-mail</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="cj-input"
              autocomplete="email"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label for="password" class="cj-label">Senha</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="cj-input"
              autocomplete="current-password"
              placeholder="Sua senha"
            />
          </div>

          <button
            type="submit"
            class="cj-btn cj-btn-primary auth-submit"
            [disabled]="submitting() || form.invalid"
          >
            {{ submitting() ? 'Entrando...' : 'Entrar na plataforma' }}
          </button>
        </form>

        <nav class="auth-links" aria-label="Ações de conta">
          <a routerLink="/activate">Ativar convite</a>
          <a routerLink="/reset-password">Esqueci minha senha</a>
        </nav>
      </section>
    </main>
  `,
  styles: `
    .auth-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.25rem;
      position: relative;
      background:
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.14), transparent 42%),
        radial-gradient(circle at bottom left, rgba(96, 165, 250, 0.12), transparent 42%),
        var(--cj-bg);
    }

    .top-action {
      position: fixed;
      top: 1rem;
      right: 1rem;
    }

    .auth-card {
      width: 100%;
      max-width: 430px;
      padding: 2rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .auth-hero {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
    }

    .auth-mascot {
      object-fit: contain;
      filter: drop-shadow(0 12px 26px rgba(56, 189, 248, 0.35));
    }

    h1 {
      margin: 0.25rem 0 0;
      font-size: 1.75rem;
      letter-spacing: -0.02em;
    }

    .auth-tagline {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--cj-primary);
    }

    .auth-alert {
      padding: 0.75rem 0.9rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.12);
      color: var(--cj-danger);
      font-size: 0.88rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .auth-submit {
      min-height: 46px;
      width: 100%;
      margin-top: 0.25rem;
    }

    .auth-links {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      font-size: 0.86rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cj-border);
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 1.5rem 1.25rem;
      }
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        const returnUrl = sanitizeInternalReturnUrl(
          this.route.snapshot.queryParamMap.get('returnUrl'),
        );
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(normalizeApiError(err).message);
      },
    });
  }
}
