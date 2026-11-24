import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { UsageSummaryResponse } from '../../core/api/api-v1.models';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { BadgeTone, StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UsageApiService } from './usage-api.service';

@Component({
  selector: 'app-my-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Meu Consumo e Quotas</h1>
        <p class="cj-muted sub">Acompanhe requisições, tokens utilizados na janela atual e seus limites diários.</p>
      </div>
      <button type="button" class="cj-btn" (click)="load()" [disabled]="loading()">Atualizar</button>
    </div>

    @if (error(); as err) {
      <div class="cj-card err-box" role="alert">{{ err }}</div>
    }

    @if (loading()) {
      <div class="cj-card cj-muted">Carregando métricas de consumo...</div>
    } @else if (summary(); as s) {
      <section class="cj-grid cj-grid-3 stats-grid">
        <article class="cj-card stat-card">
          <span class="cj-muted stat-label">Requisições hoje</span>
          <strong class="stat-value">
            {{ s.usedRequests | number }} / {{ s.quota.dailyRequestLimit | number }}
          </strong>
          <div class="meter">
            <div class="meter-fill" [style.width.%]="requestPercent()"></div>
          </div>
          <span class="cj-muted small">Restantes: {{ s.remainingRequests | number }}</span>
        </article>

        <article class="cj-card stat-card">
          <span class="cj-muted stat-label">Tokens hoje</span>
          <strong class="stat-value">
            {{ s.usedTokens | number }} / {{ s.quota.dailyTokenLimit | number }}
          </strong>
          <div class="meter">
            <div class="meter-fill" [style.width.%]="tokenPercent()"></div>
          </div>
          <span class="cj-muted small">Restantes: {{ s.remainingTokens | number }}</span>
        </article>

        <article class="cj-card stat-card">
          <span class="cj-muted stat-label">Concorrência máxima</span>
          <strong class="stat-value">{{ s.quota.maxConcurrentGenerations }}</strong>
          <span class="cj-muted small">
            Janela: {{ s.windowStart | date: 'dd/MM HH:mm' }} – {{ s.windowEnd | date: 'dd/MM HH:mm' }}
          </span>
        </article>
      </section>

      <section class="cj-card">
        <h2>Atividade recente ({{ s.recentRecords.length }})</h2>
        @if (s.recentRecords.length === 0) {
          <app-empty-state
            title="Sem registros nesta janela"
            description="Suas interações no chat, CLI ou agente aparecerão aqui com contagem exata de tokens e latência."
          />
        } @else {
          <div class="cj-table-wrap">
            <table class="cj-table">
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Modelo</th>
                  <th>Tokens (prompt / resp. / total)</th>
                  <th>Latência</th>
                  <th>Resultado</th>
                  <th>Horário</th>
                </tr>
              </thead>
              <tbody>
                @for (rec of s.recentRecords; track rec.id) {
                  <tr>
                    <td>{{ rec.source }}</td>
                    <td class="cj-mono">{{ rec.modelId || '—' }}</td>
                    <td class="cj-mono">
                      {{ rec.promptTokens | number }} / {{ rec.completionTokens | number }} /
                      <strong>{{ rec.totalTokens | number }}</strong>
                    </td>
                    <td>{{ rec.latencyMs | number }} ms</td>
                    <td>
                      <app-status-badge [label]="rec.outcome" [tone]="outcomeTone(rec.outcome)" />
                    </td>
                    <td>{{ rec.recordedAt | date: 'dd/MM HH:mm:ss' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
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

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .stat-label {
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      font-size: 1.35rem;
      letter-spacing: -0.02em;
    }

    .meter {
      height: 8px;
      border-radius: 999px;
      background: var(--cj-surface-elevated);
      overflow: hidden;
      border: 1px solid var(--cj-border);
    }

    .meter-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--cj-primary), var(--cj-accent));
    }

    .small {
      font-size: 0.82rem;
    }

    h2 {
      margin: 0 0 0.85rem;
      font-size: 1.1rem;
    }
  `,
})
export class MyUsageComponent implements OnInit {
  private readonly api = inject(UsageApiService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<UsageSummaryResponse | null>(null);

  protected readonly requestPercent = computed(() => {
    const s = this.summary();
    if (!s || s.quota.dailyRequestLimit <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((s.usedRequests / s.quota.dailyRequestLimit) * 100));
  });

  protected readonly tokenPercent = computed(() => {
    const s = this.summary();
    if (!s || s.quota.dailyTokenLimit <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((s.usedTokens / s.quota.dailyTokenLimit) * 100));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getMyUsage().subscribe({
      next: (res) => {
        this.summary.set(res);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(normalizeApiError(err).message);
      },
    });
  }

  outcomeTone(outcome: string): BadgeTone {
    const upper = outcome.toUpperCase();
    if (upper === 'COMPLETED' || upper === 'SUCCESS') {
      return 'success';
    }
    if (upper === 'FAILED' || upper === 'REJECTED') {
      return 'danger';
    }
    return 'warning';
  }
}
