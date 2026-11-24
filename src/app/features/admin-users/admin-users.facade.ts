import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CreateManagedUserRequest,
  CreatedManagedUserResponse,
  UserStatus,
  UserSummaryResponse,
} from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { AdminUsersApiService } from './admin-users-api.service';

@Injectable()
export class AdminUsersFacade {
  private readonly api = inject(AdminUsersApiService);
  private readonly notifications = inject(NotificationService);

  private readonly itemsSignal = signal<readonly UserSummaryResponse[]>([]);
  private readonly totalSignal = signal(0);
  private readonly pageSignal = signal(0);
  private readonly sizeSignal = signal(20);
  private readonly statusFilterSignal = signal<UserStatus | ''>('');
  private readonly searchSignal = signal('');
  private readonly loadingSignal = signal(false);
  private readonly submittingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly lastInviteSignal = signal<CreatedManagedUserResponse | null>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly size = this.sizeSignal.asReadonly();
  readonly totalElements = this.totalSignal.asReadonly();
  readonly statusFilter = this.statusFilterSignal.asReadonly();
  readonly search = this.searchSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly submitting = this.submittingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly lastInvite = this.lastInviteSignal.asReadonly();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalSignal() / this.sizeSignal())),
  );

  readonly filteredUsers = computed(() => {
    const query = this.searchSignal().trim().toLowerCase();
    const list = this.itemsSignal();
    if (!query) {
      return list;
    }
    return list.filter(
      (u) =>
        u.email.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query),
    );
  });

  load(page = this.pageSignal()): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.pageSignal.set(page);

    this.api.listUsers(page, this.sizeSignal(), this.statusFilterSignal()).subscribe({
      next: (res) => {
        this.itemsSignal.set(res.items);
        this.totalSignal.set(res.totalElements);
        this.loadingSignal.set(false);
      },
      error: (err: unknown) => {
        this.errorSignal.set(normalizeApiError(err).message);
        this.loadingSignal.set(false);
      },
    });
  }

  setStatusFilter(status: UserStatus | ''): void {
    this.statusFilterSignal.set(status);
    this.load(0);
  }

  setSearch(term: string): void {
    this.searchSignal.set(term);
  }

  createUser(req: CreateManagedUserRequest, onCreated?: () => void): void {
    this.submittingSignal.set(true);
    this.errorSignal.set(null);

    this.api.createUser(req).subscribe({
      next: (created) => {
        this.submittingSignal.set(false);
        this.lastInviteSignal.set(created);
        this.notifications.success(`Convite criado para ${created.user.email}.`);
        this.load(0);
        onCreated?.();
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  suspendUser(userId: string): void {
    this.submittingSignal.set(true);
    this.api.suspendUser(userId).subscribe({
      next: (updated) => {
        this.submittingSignal.set(false);
        this.itemsSignal.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
        this.notifications.warning(`Conta ${updated.email} suspensa.`);
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.notifications.error(normalizeApiError(err).message);
      },
    });
  }

  dismissInvite(): void {
    this.lastInviteSignal.set(null);
  }
}
