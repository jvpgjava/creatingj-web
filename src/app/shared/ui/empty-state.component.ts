import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      @if (showMascot()) {
        <img
          src="assets/creatingj-mascot.png"
          alt="Mascote CreatingJ"
          class="mascot"
          width="112"
          height="112"
        />
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
      padding: 2.5rem 1.5rem;
      border: 1px dashed var(--cj-border);
      border-radius: var(--cj-radius);
      background: var(--cj-surface);
      gap: 0.5rem;
    }

    .mascot {
      object-fit: contain;
      filter: drop-shadow(0 8px 18px rgba(56, 189, 248, 0.25));
      margin-bottom: 0.4rem;
    }

    h3 {
      margin: 0;
      font-size: 1.1rem;
    }

    p {
      margin: 0 0 0.5rem;
      max-width: 460px;
      font-size: 0.92rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly showMascot = input(false);
}
