import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  readonly id: number;
  readonly kind: ToastKind;
  readonly text: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly itemsSignal = signal<readonly ToastMessage[]>([]);

  readonly items = this.itemsSignal.asReadonly();

  show(kind: ToastKind, text: string, durationMs = 5000): void {
    const id = this.nextId++;
    this.itemsSignal.update((list) => [...list.slice(-3), { id, kind, text }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(text: string): void {
    this.show('success', text);
  }

  error(text: string): void {
    this.show('error', text, 7000);
  }

  warning(text: string): void {
    this.show('warning', text, 6000);
  }

  info(text: string): void {
    this.show('info', text);
  }

  dismiss(id: number): void {
    this.itemsSignal.update((list) => list.filter((item) => item.id !== id));
  }
}
