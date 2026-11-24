import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { normalizeApiError } from '../../core/errors/problem-detail';

function isAllowedPkceRedirect(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    const isLoopback =
      parsed.protocol === 'http:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
    const isNativeScheme =
      parsed.protocol === 'creatingj:' || parsed.protocol === 'vscode:';
    return isLoopback || isNativeScheme;
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-pkce-authorize',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pkce-page">
      <section class="cj-card pkce-card">
        <img src="assets/creatingj-mascot.png" alt="Mascote CreatingJ" width="96" height="96" />
        <h1>Autorizar aplicativo CreatingJ</h1>

        @if (errorMessage(); as error) {
          <div class="alert" role="alert">{{ error }}</div>
        } @else {
          <p class="cj-muted">
            O cliente <strong>{{ clientId() }}</strong> está solicitando acesso à sua conta
            <strong>{{ auth.user()?.email }}</strong>.
          </p>
          <div class="meta cj-mono">Destino: {{ redirectUri() }}</div>
          <div class="actions">
            <button type="button" class="cj-btn" (click)="cancel()">Recusar</button>
            <button
              type="button"
              class="cj-btn cj-btn-primary"
              [disabled]="submitting()"
              (click)="approve()"
            >
              {{ submitting() ? 'Autorizando...' : 'Aprovar acesso' }}
            </button>
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    .pkce-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.25rem;
    }

    .pkce-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem 1.5rem;
    }

    .meta {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border-radius: var(--cj-radius-sm);
      background: var(--cj-surface-elevated);
      border: 1px solid var(--cj-border);
      font-size: 0.82rem;
      word-break: break-all;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
    }

    .alert {
      width: 100%;
      padding: 0.75rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.12);
      color: var(--cj-danger);
      font-size: 0.88rem;
    }
  `,
})
export class PkceAuthorizeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AuthApiService);
  protected readonly auth = inject(AuthStore);

  protected readonly clientId = signal('');
  protected readonly redirectUri = signal('');
  protected readonly codeChallenge = signal('');
  protected readonly state = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const clientId = qp.get('client_id') ?? '';
    const redirectUri = qp.get('redirect_uri') ?? '';
    const codeChallenge = qp.get('code_challenge') ?? '';
    const method = qp.get('code_challenge_method') ?? '';
    const state = qp.get('state') ?? '';

    if (!clientId || !redirectUri || !codeChallenge || method !== 'S256' || !state) {
      this.errorMessage.set('Parâmetros PKCE ausentes ou inválidos (método S256 obrigatório).');
      return;
    }
    if (!isAllowedPkceRedirect(redirectUri)) {
      this.errorMessage.set('URI de redirecionamento PKCE não permitida.');
      return;
    }

    this.clientId.set(clientId);
    this.redirectUri.set(redirectUri);
    this.codeChallenge.set(codeChallenge);
    this.state.set(state);
  }

  approve(): void {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.api
      .authorizePkce({
        clientId: this.clientId(),
        redirectUri: this.redirectUri(),
        codeChallenge: this.codeChallenge(),
        codeChallengeMethod: 'S256',
        state: this.state(),
      })
      .subscribe({
        next: (res) => {
          const target = new URL(res.redirectUri);
          target.searchParams.set('code', res.authorizationCode);
          target.searchParams.set('state', res.state);
          window.location.assign(target.toString());
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(normalizeApiError(err).message);
        },
      });
  }

  cancel(): void {
    void this.router.navigateByUrl('/app/chat');
  }
}
