import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminUsageOverviewResponse, UserSummaryResponse } from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { AdminUsersApiService } from '../admin-users/admin-users-api.service';
import { UsageApiService } from './usage-api.service';

@Component({
  selector: 'app-admin-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Consumo Global e Quotas</h1>
        <p class="cj-muted sub">Visão agregada do consumo diário e ajuste de limites por usuário.</p>
      </div>
      <button type="button" class="cj-btn" (click)="load()" [disabled]="loading()">Atualizar</button>
    </div>

    @if (error(); as err) {
      <div class="cj-card err-box" role="alert">{{ err }}</div>
    }

    @if (overview(); as ov) {
      <section class="cj-grid cj-grid-2 stats-grid">
        <article class="cj-card">
          <div class="cj-muted stat-label">Total de requisições hoje</div>
          <strong class="stat-value">{{ ov.totalRequestsToday | number }}</strong>
          <div class="cj-muted small">
            Janela: {{ ov.windowStart | date: 'dd/MM HH:mm' }} – {{ ov.windowEnd | date: 'dd/MM HH:mm' }}
          </div>
        </article>
        <article class="cj-card">
          <div class="cj-muted stat-label">Total de tokens hoje</div>
          <strong class="stat-value">{{ ov.totalTokensToday | number }}</strong>
          <div class="cj-muted small">Agregado entre chat, CLI e agentes autorizados</div>
        </article>
      </section>
    }

    <section class="cj-card">
      <h2>Atualizar quota de um usuário</h2>
      <form [formGroup]="quotaForm" (ngSubmit)="submitQuota()" class="quota-grid">
        <div class="span-full">
          <label for="quota-user" class="cj-label">Usuário alvo</label>
          <select id="quota-user" formControlName="userId" class="cj-select">
            <option value="">Selecione um usuário</option>
            @for (u of users(); track u.id) {
              <option [value]="u.id">{{ u.displayName }} ({{ u.email }})</option>
            }
          </select>
        </div>

        <div>
          <label for="daily-req" class="cj-label">Limite diário de requisições</label>
          <input id="daily-req" type="number" formControlName="dailyRequestLimit" class="cj-input" min="1" />
        </div>

        <div>
          <label for="daily-tok" class="cj-label">Limite diário de tokens</label>
          <input id="daily-tok" type="number" formControlName="dailyTokenLimit" class="cj-input" min="1000" />
        </div>

        <div>
          <label for="max-conc" class="cj-label">Máx. gerações simultâneas</label>
          <input id="max-conc" type="number" formControlName="maxConcurrentGenerations" class="cj-input" min="1" max="20" />
        </div>

        <div class="span-full">
          <button
            type="submit"
            class="cj-btn cj-btn-primary"
            [disabled]="submitting() || quotaForm.invalid"
          >
            {{ submitting() ? 'Salvando...' : 'Salvar limites' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .sub {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
    }

    .err-box {
      margin-bottom: 1rem;
      border-color: var(--cj-danger);
      color: var(--cj-danger);
    }

    .stats-grid {
      margin-bottom: 1rem;
    }

    .stat-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      display: block;
      margin: 0.35rem 0;
      font-size: 1.6rem;
    }

    .small {
      font-size: 0.82rem;
    }

    h2 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
    }

    .quota-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.9rem;
    }

    .span-full {
      grid-column: 1 / -1;
    }
  `,
})
export class AdminUsageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usageApi = inject(UsageApiService);
  private readonly usersApi = inject(AdminUsersApiService);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly overview = signal<AdminUsageOverviewResponse | null>(null);
  protected readonly users = signal<readonly UserSummaryResponse[]>([]);

  protected readonly quotaForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
    dailyRequestLimit: [500, [Validators.required, Validators.min(1)]],
    dailyTokenLimit: [10_000_000, [Validators.required, Validators.min(1000)]],
    maxConcurrentGenerations: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      overview: this.usageApi.getAdminOverview(),
      users: this.usersApi.listUsers(0, 100),
    }).subscribe({
      next: ({ overview, users }) => {
        this.overview.set(overview);
        this.users.set(users.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(normalizeApiError(err).message);
      },
    });
  }

  submitQuota(): void {
    if (this.quotaForm.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    const { userId, dailyRequestLimit, dailyTokenLimit, maxConcurrentGenerations } =
      this.quotaForm.getRawValue();

    this.usageApi
      .updateUserQuota(userId, {
        dailyRequestLimit,
        dailyTokenLimit,
        maxConcurrentGenerations,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notifications.success('Quotas do usuário atualizadas com sucesso.');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(normalizeApiError(err).message);
        },
      });
  }
}
