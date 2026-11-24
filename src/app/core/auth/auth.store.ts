import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { CurrentUserResponse } from '../api/api-v1.models';
import { NotificationService } from '../errors/notification.service';
import { AuthApiService } from './auth-api.service';

export function sanitizeInternalReturnUrl(raw: string | null | undefined): string {
  if (!raw) {
    return '/app/chat';
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return '/app/chat';
  }
  return trimmed;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  private readonly userSignal = signal<CurrentUserResponse | null>(null);
  private readonly initializedSignal = signal(false);
  private readonly loadingSignal = signal(false);
  private inFlightBootstrap$: Observable<CurrentUserResponse | null> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly authenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.roles.includes('ADMIN') ?? false);

  bootstrapSession(): Observable<CurrentUserResponse | null> {
    if (this.initializedSignal()) {
      return of(this.userSignal());
    }
    if (this.inFlightBootstrap$) {
      return this.inFlightBootstrap$;
    }

    this.loadingSignal.set(true);
    this.inFlightBootstrap$ = this.api.me().pipe(
      tap((user) => {
        this.userSignal.set(user);
        this.initializedSignal.set(true);
      }),
      catchError(() => {
        this.userSignal.set(null);
        this.initializedSignal.set(true);
        return of(null);
      }),
      finalize(() => {
        this.loadingSignal.set(false);
        this.inFlightBootstrap$ = null;
      }),
      shareReplay(1),
    );

    return this.inFlightBootstrap$;
  }

  login(email: string, password: string): Observable<CurrentUserResponse> {
    this.loadingSignal.set(true);
    return this.api.webLogin({ email: email.trim(), password }).pipe(
      switchMap(() => this.api.me()),
      tap((user) => {
        this.userSignal.set(user);
        this.initializedSignal.set(true);
      }),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // session may already be expired
    } finally {
      this.userSignal.set(null);
      this.initializedSignal.set(true);
      this.notifications.info('Sessão encerrada com segurança.');
      await this.router.navigateByUrl('/login');
    }
  }

  handleSessionExpired(currentUrl: string): void {
    const wasAuthenticated = this.userSignal() !== null;
    this.userSignal.set(null);
    this.initializedSignal.set(true);

    if (currentUrl.startsWith('/login')) {
      return;
    }

    if (wasAuthenticated) {
      this.notifications.warning('Sua sessão expirou. Faça login novamente.');
    }

    const safeReturn = sanitizeInternalReturnUrl(currentUrl);
    void this.router.navigate(['/login'], { queryParams: { returnUrl: safeReturn } });
  }

  hasRole(role: 'ADMIN' | 'MEMBER' | 'SUPPORT'): boolean {
    return this.userSignal()?.roles.includes(role) ?? false;
  }

  refreshUser(): Observable<CurrentUserResponse | null> {
    return this.api.me().pipe(
      tap((user) => this.userSignal.set(user)),
      map((user) => user),
      catchError(() => {
        this.userSignal.set(null);
        return of(null);
      }),
    );
  }
}
