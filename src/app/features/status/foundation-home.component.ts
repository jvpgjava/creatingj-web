import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SystemApiService } from '../../core/api/system-api.service';
import { SystemStatusResponse } from '../../core/api/api-v1.models';
import { ThemeService } from '../../core/layout/theme.service';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';

@Component({
  selector: 'app-foundation-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadgeComponent],
  template: `
    <main class="hero-wrap">
      <section class="cj-card hero-card">
        <img
          src="assets/creatingj-mascot.png"
          alt="Mascote 3D CreatingJ"
          class="hero-mascot"
          width="156"
          height="156"
        />
        <h1>CreatingJ Web</h1>
        <p class="tagline">Não existe limite para sua imaginação.</p>

        <div class="status-row">
          @if (loading()) {
            <app-status-badge label="Verificando API..." tone="info" />
          } @else if (status(); as s) {
            <app-status-badge [label]="s.service + ' ' + s.apiVersion + ' • ' + s.status" tone="success" />
          } @else {
            <app-status-badge label="Backend offline ou inacessível" tone="warning" />
          }
          <button type="button" class="cj-btn" (click)="theme.toggle()">
            Tema: {{ theme.mode() === 'dark' ? 'Escuro' : 'Claro' }}
          </button>
        </div>
      </section>
    </main>
  `,
  styles: `
    .hero-wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }

    .hero-card {
      max-width: 520px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2.25rem;
    }

    .hero-mascot {
      object-fit: contain;
      filter: drop-shadow(0 12px 28px rgba(56, 189, 248, 0.35));
    }

    h1 {
      margin: 0;
      font-size: 1.9rem;
      letter-spacing: -0.02em;
    }

    .tagline {
      margin: 0;
      color: var(--cj-primary);
      font-weight: 600;
    }

    .status-row {
      margin-top: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }
  `,
})
export class FoundationHomeComponent implements OnInit {
  private readonly systemApi = inject(SystemApiService);
  protected readonly theme = inject(ThemeService);

  protected readonly loading = signal(true);
  protected readonly status = signal<SystemStatusResponse | null>(null);

  ngOnInit(): void {
    this.systemApi.getStatus().subscribe({
      next: (res) => {
        this.status.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.status.set(null);
        this.loading.set(false);
      },
    });
  }
}
