import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../core/errors/notification.service';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="toast-stack"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notificações"
    >
      @for (toast of notifications.items(); track toast.id) {
        <div class="toast" [attr.data-kind]="toast.kind" role="status">
          <span class="toast-text">{{ toast.text }}</span>
          <button
            type="button"
            class="toast-close"
            (click)="notifications.dismiss(toast.id)"
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .toast-stack {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-width: min(400px, calc(100vw - 2rem));
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.8rem 1rem;
      border-radius: var(--cj-radius-sm);
      background: var(--cj-surface-elevated);
      border: 1px solid var(--cj-border);
      box-shadow: var(--cj-shadow);
      font-size: 0.9rem;
    }

    .toast[data-kind='success'] {
      border-color: var(--cj-success);
    }

    .toast[data-kind='warning'] {
      border-color: var(--cj-warning);
    }

    .toast[data-kind='error'] {
      border-color: var(--cj-danger);
    }

    .toast-close {
      border: none;
      background: transparent;
      color: var(--cj-text-muted);
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }
  `,
})
export class ToastContainerComponent {
  protected readonly notifications = inject(NotificationService);
}
