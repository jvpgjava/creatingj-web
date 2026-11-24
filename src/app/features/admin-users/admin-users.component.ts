import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserRole, UserStatus, UserSummaryResponse } from '../../core/api/api-v1.models';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationService } from '../../core/errors/notification.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { BadgeTone, StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { AdminUsersFacade } from './admin-users.facade';

@Component({
  selector: 'app-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminUsersFacade],
  imports: [ReactiveFormsModule, DatePipe, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Administração de Usuários</h1>
        <p class="cj-muted sub">
          Crie contas sob convite, acompanhe ativações e suspenda acessos. Não há cadastro público.
        </p>
      </div>
      <button
        type="button"
        class="cj-btn cj-btn-primary"
        (click)="showCreateForm.set(!showCreateForm())"
      >
        {{ showCreateForm() ? 'Fechar formulário' : '+ Novo usuário' }}
      </button>
    </div>

    @if (facade.lastInvite(); as invite) {
      <section class="cj-card invite-banner" role="status">
        <div class="invite-head">
          <div>
            <strong>Convite gerado para {{ invite.user.email }}</strong>
            <div class="cj-muted invite-exp">
              Expira em {{ invite.activationExpiresAt | date: 'dd/MM/yyyy HH:mm' }}
            </div>
          </div>
          <button type="button" class="cj-btn" (click)="facade.dismissInvite()">Ocultar</button>
        </div>
        <div class="invite-token cj-mono">{{ buildActivationLink(invite.activationToken) }}</div>
        <div class="invite-actions">
          <button
            type="button"
            class="cj-btn cj-btn-primary"
            (click)="copyText(buildActivationLink(invite.activationToken), 'Link de ativação copiado!')"
          >
            Copiar link de ativação
          </button>
          <button
            type="button"
            class="cj-btn"
            (click)="copyText(invite.activationToken, 'Token copiado!')"
          >
            Copiar apenas token
          </button>
        </div>
      </section>
    }

    @if (showCreateForm()) {
      <section class="cj-card create-card" aria-label="Criar novo usuário">
        <h2>Novo convite de usuário</h2>
        <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="create-grid">
          <div>
            <label for="new-email" class="cj-label">E-mail</label>
            <input
              id="new-email"
              type="email"
              formControlName="email"
              class="cj-input"
              placeholder="dev@empresa.com"
            />
          </div>

          <div>
            <label for="new-name" class="cj-label">Nome de exibição</label>
            <input
              id="new-name"
              type="text"
              formControlName="displayName"
              class="cj-input"
              placeholder="Maria Silva"
            />
          </div>

          <fieldset class="roles-box">
            <legend class="cj-label">Perfis de acesso</legend>
            <div class="roles-row">
              @for (role of availableRoles; track role) {
                <label class="role-check">
                  <input
                    type="checkbox"
                    [checked]="selectedRoles().includes(role)"
                    (change)="toggleRole(role)"
                  />
                  <span>{{ role }}</span>
                </label>
              }
            </div>
          </fieldset>

          <div class="create-actions">
            <button
              type="submit"
              class="cj-btn cj-btn-primary"
              [disabled]="facade.submitting() || createForm.invalid || selectedRoles().length === 0"
            >
              {{ facade.submitting() ? 'Criando...' : 'Criar conta e gerar convite' }}
            </button>
          </div>
        </form>
      </section>
    }

    <section class="cj-card toolbar">
      <div class="toolbar-field">
        <label for="user-search" class="cj-label">Filtrar na página</label>
        <input
          id="user-search"
          type="search"
          class="cj-input"
          placeholder="Buscar por nome ou e-mail..."
          [value]="facade.search()"
          (input)="onSearch($event)"
        />
      </div>
      <div class="toolbar-field toolbar-select">
        <label for="status-filter" class="cj-label">Status</label>
        <select
          id="status-filter"
          class="cj-select"
          [value]="facade.statusFilter()"
          (change)="onStatusChange($event)"
        >
          <option value="">Todos</option>
          <option value="ACTIVE">Ativos</option>
          <option value="PENDING_ACTIVATION">Aguardando ativação</option>
          <option value="SUSPENDED">Suspensos</option>
        </select>
      </div>
    </section>

    @if (facade.error(); as err) {
      <div class="cj-card error-card" role="alert">{{ err }}</div>
    }

    @if (facade.loading()) {
      <div class="cj-card cj-muted">Carregando usuários...</div>
    } @else if (facade.filteredUsers().length === 0) {
      <app-empty-state
        title="Nenhum usuário encontrado"
        description="Ajuste os filtros ou crie um novo convite acima."
      />
    } @else {
      <section class="cj-card desktop-table">
        <div class="cj-table-wrap">
          <table class="cj-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfis</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (user of facade.filteredUsers(); track user.id) {
                <tr>
                  <td>
                    <div class="u-name">{{ user.displayName }}</div>
                    <div class="cj-muted u-email">{{ user.email }}</div>
                  </td>
                  <td>{{ user.roles.join(', ') }}</td>
                  <td>
                    <app-status-badge [label]="statusLabel(user.status)" [tone]="statusTone(user.status)" />
                  </td>
                  <td>{{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    @if (canSuspend(user)) {
                      <button
                        type="button"
                        class="cj-btn cj-btn-danger"
                        [disabled]="facade.submitting()"
                        (click)="confirmSuspend(user)"
                      >
                        Suspender
                      </button>
                    } @else {
                      <span class="cj-muted">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="mobile-cards" aria-label="Lista de usuários">
        @for (user of facade.filteredUsers(); track user.id) {
          <article class="cj-card user-card">
            <div class="user-card-top">
              <div>
                <div class="u-name">{{ user.displayName }}</div>
                <div class="cj-muted u-email">{{ user.email }}</div>
              </div>
              <app-status-badge [label]="statusLabel(user.status)" [tone]="statusTone(user.status)" />
            </div>
            <div class="user-card-meta cj-muted">
              <span>Perfis: {{ user.roles.join(', ') }}</span>
              <span>Criado: {{ user.createdAt | date: 'dd/MM/yyyy' }}</span>
            </div>
            @if (canSuspend(user)) {
              <button
                type="button"
                class="cj-btn cj-btn-danger full-btn"
                [disabled]="facade.submitting()"
                (click)="confirmSuspend(user)"
              >
                Suspender conta
              </button>
            }
          </article>
        }
      </section>

      <nav class="pagination" aria-label="Paginação">
        <span class="cj-muted">
          Total: {{ facade.totalElements() }} • Página {{ facade.page() + 1 }} de {{ facade.totalPages() }}
        </span>
        <div class="pagination-btns">
          <button
            type="button"
            class="cj-btn"
            [disabled]="facade.page() === 0"
            (click)="facade.load(facade.page() - 1)"
          >
            Anterior
          </button>
          <button
            type="button"
            class="cj-btn"
            [disabled]="facade.page() + 1 >= facade.totalPages()"
            (click)="facade.load(facade.page() + 1)"
          >
            Próxima
          </button>
        </div>
      </nav>
    }
  `,
  styles: `
    .sub {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
    }

    .invite-banner {
      margin-bottom: 1rem;
      border-color: rgba(34, 197, 94, 0.55);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .invite-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .invite-exp {
      font-size: 0.82rem;
    }

    .invite-token {
      padding: 0.65rem 0.8rem;
      background: var(--cj-surface-elevated);
      border: 1px solid var(--cj-border);
      border-radius: var(--cj-radius-sm);
      font-size: 0.82rem;
      word-break: break-all;
    }

    .invite-actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .create-card {
      margin-bottom: 1rem;
    }

    .create-card h2 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
    }

    .create-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      align-items: end;
    }

    .roles-box {
      border: 1px solid var(--cj-border);
      border-radius: var(--cj-radius-sm);
      padding: 0.65rem 0.85rem;
      margin: 0;
    }

    .roles-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .role-check {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .create-actions {
      display: flex;
      justify-content: flex-end;
    }

    .toolbar {
      margin-bottom: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.9rem;
      align-items: flex-end;
    }

    .toolbar-field {
      flex: 1 1 240px;
    }

    .toolbar-select {
      flex: 0 1 220px;
    }

    .error-card {
      margin-bottom: 1rem;
      border-color: var(--cj-danger);
      color: var(--cj-danger);
    }

    .u-name {
      font-weight: 600;
    }

    .u-email {
      font-size: 0.82rem;
      word-break: break-all;
    }

    .mobile-cards {
      display: none;
      flex-direction: column;
      gap: 0.8rem;
    }

    .user-card {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .user-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .user-card-meta {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.4rem;
      font-size: 0.84rem;
    }

    .full-btn {
      width: 100%;
      min-height: 42px;
    }

    .pagination {
      margin-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.88rem;
    }

    .pagination-btns {
      display: flex;
      gap: 0.5rem;
    }

    @media (max-width: 768px) {
      .desktop-table {
        display: none;
      }

      .mobile-cards {
        display: flex;
      }
    }
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly notifications = inject(NotificationService);
  protected readonly facade = inject(AdminUsersFacade);

  protected readonly availableRoles: readonly UserRole[] = ['MEMBER', 'ADMIN', 'SUPPORT'];
  protected readonly showCreateForm = signal(false);
  protected readonly selectedRoles = signal<UserRole[]>(['MEMBER']);

  protected readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.facade.load(0);
  }

  toggleRole(role: UserRole): void {
    this.selectedRoles.update((roles) =>
      roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role],
    );
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.selectedRoles().length === 0) {
      return;
    }
    const { email, displayName } = this.createForm.getRawValue();
    this.facade.createUser(
      {
        email: email.trim(),
        displayName: displayName.trim(),
        roles: this.selectedRoles(),
      },
      () => {
        this.createForm.reset({ email: '', displayName: '' });
        this.selectedRoles.set(['MEMBER']);
        this.showCreateForm.set(false);
      },
    );
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.facade.setSearch(value);
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as UserStatus | '';
    this.facade.setStatusFilter(value);
  }

  canSuspend(user: UserSummaryResponse): boolean {
    return user.status !== 'SUSPENDED' && user.id !== this.auth.user()?.id;
  }

  confirmSuspend(user: UserSummaryResponse): void {
    if (typeof window !== 'undefined' && !window.confirm(`Suspender a conta ${user.email}?`)) {
      return;
    }
    this.facade.suspendUser(user.id);
  }

  statusLabel(status: UserStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'Ativo';
      case 'PENDING_ACTIVATION':
        return 'Pendente';
      case 'SUSPENDED':
        return 'Suspenso';
    }
  }

  statusTone(status: UserStatus): BadgeTone {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING_ACTIVATION':
        return 'warning';
      case 'SUSPENDED':
        return 'danger';
    }
  }

  buildActivationLink(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/activate?token=${encodeURIComponent(token)}`;
  }

  copyText(text: string, message: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => this.notifications.success(message));
    }
  }
}
