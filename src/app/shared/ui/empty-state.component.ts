import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      @if (showMascot()) {
        <div class="mascot-aura">
          <img
            src="assets/creatingj-mascot.png"
            alt="Mascote CreatingJ"
            class="mascot"
            width="108"
            height="108"
          />
        </div>
      }
      <h3>{{ title() }}</h3>
      <p class="cj-muted">{{ description() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3rem 1.5rem;
      border: 1px solid var(--cj-border);
      border-radius: var(--cj-radius);
      background:
        radial-gradient(circle at 50% 25%, rgba(14, 165, 233, 0.09), transparent 55%),
        var(--cj-surface);
      box-shadow: var(--cj-shadow);
      gap: 0.5rem;
    }

    .mascot-aura {
      width: 124px;
      height: 124px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 72%);
      margin-bottom: 0.35rem;
    }

    .mascot {
      object-fit: contain;
      filter: drop-shadow(0 12px 22px rgba(14, 165, 233, 0.3));
    }

    h3 {
      margin: 0;
      font-size: 1.08rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }

    p {
      margin: 0 0 0.4rem;
      max-width: 440px;
      font-size: 0.9rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly showMascot = input(false);
}
