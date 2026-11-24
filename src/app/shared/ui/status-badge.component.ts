import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [attr.data-tone]="tone()">
      {{ label() }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
      color: var(--cj-text);
    }

    .badge[data-tone='info'] {
      border-color: rgba(56, 189, 248, 0.45);
      background: rgba(56, 189, 248, 0.14);
      color: var(--cj-primary);
    }

    .badge[data-tone='success'] {
      border-color: rgba(34, 197, 94, 0.45);
      background: rgba(34, 197, 94, 0.14);
      color: var(--cj-success);
    }

    .badge[data-tone='warning'] {
      border-color: rgba(245, 158, 11, 0.45);
      background: rgba(245, 158, 11, 0.14);
      color: var(--cj-warning);
    }

    .badge[data-tone='danger'] {
      border-color: rgba(239, 68, 68, 0.45);
      background: rgba(239, 68, 68, 0.14);
      color: var(--cj-danger);
    }
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');
}
