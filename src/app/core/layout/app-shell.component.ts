import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent, IconName } from '../../shared/ui/icon.component';
import { AuthStore } from '../auth/auth.store';
import { NetworkStatusService } from './network-status.service';
import { ThemeService } from './theme.service';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="shell" [class.drawer-open]="drawerOpen()">
      @if (drawerOpen()) {
        <button
          type="button"
          class="backdrop"
          aria-label="Fechar menu lateral"
          (click)="closeDrawer()"
        ></button>
      }

      <aside class="sidebar" aria-label="Navegação principal">
        <div class="brand">
          <div class="brand-badge">
            <img
              src="assets/creatingj-mascot.png"
              alt="Mascote CreatingJ"
              width="34"
              height="34"
              class="brand-logo"
            />
          </div>
          <div class="brand-copy">
            <span class="brand-name">CreatingJ</span>
            <span class="brand-tagline">Workspace de IA</span>
          </div>
          <button
            type="button"
            class="icon-btn mobile-only"
            (click)="closeDrawer()"
            aria-label="Fechar menu"
          >
            <app-icon name="close" [size]="18" />
          </button>
        </div>

        <nav class="nav-groups">
          <div class="nav-group">
            <span class="nav-group-title">Plataforma</span>
            @for (item of memberItems; track item.path) {
              <a
                class="nav-link"
                [routerLink]="item.path"
                routerLinkActive="active"
                (click)="closeDrawer()"
              >
                <app-icon [name]="item.icon" [size]="17" />
                <span>{{ item.label }}</span>
              </a>
            }
          </div>

          @if (auth.isAdmin()) {
            <div class="nav-group">
              <span class="nav-group-title">Administração</span>
              @for (item of adminItems; track item.path) {
                <a
                  class="nav-link"
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  (click)="closeDrawer()"
                >
                  <app-icon [name]="item.icon" [size]="17" />
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }

          <div class="nav-group">
            <span class="nav-group-title">Conta</span>
            <a
              class="nav-link"
              routerLink="/settings"
              routerLinkActive="active"
              (click)="closeDrawer()"
            >
              <app-icon name="settings" [size]="17" />
              <span>Perfil e Sessões</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          @if (auth.user(); as user) {
            <div class="user-card">
              <div class="avatar" aria-hidden="true">{{ userInitials() }}</div>
              <div class="user-chip">
                <div class="user-name">{{ user.displayName || user.email }}</div>
                <div class="user-email cj-muted">{{ user.email }}</div>
              </div>
            </div>
          }
          <div class="footer-actions">
            <button
              type="button"
              class="cj-btn btn-compact"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.mode() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'"
            >
              <app-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" [size]="15" />
              <span>{{ theme.mode() === 'dark' ? 'Claro' : 'Escuro' }}</span>
            </button>
            <button type="button" class="cj-btn cj-btn-danger btn-compact" (click)="logout()">
              <app-icon name="logout" [size]="15" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <div class="main-column">
        <header class="topbar">
          <button
            type="button"
            class="icon-btn mobile-only"
            (click)="toggleDrawer()"
            [attr.aria-expanded]="drawerOpen()"
            aria-label="Abrir menu de navegação"
          >
            <app-icon name="menu" [size]="18" />
          </button>

          <div class="topbar-brand mobile-only">
            <img src="assets/creatingj-mascot.png" alt="" width="26" height="26" />
            <span>CreatingJ</span>
          </div>

          <div class="topbar-tagline desktop-only">
            Não existe limite para sua imaginação.
          </div>

          <div class="topbar-spacer"></div>

          @if (auth.user(); as user) {
            <span class="role-pill">
              <app-icon name="shield" [size]="12" />
              <span>{{ auth.isAdmin() ? 'ADMIN' : 'MEMBRO' }}</span>
            </span>
            <span class="topbar-email desktop-only cj-muted">{{ user.email }}</span>
          }
        </header>

        <main class="content">
          @if (!network.online()) {
            <div class="offline-banner" role="alert">
              Você está sem conexão com a internet. Algumas ações aguardam reconexão com o servidor.
            </div>
          }
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: 268px minmax(0, 1fr);
      min-height: 100dvh;
      background: var(--cj-bg-glow), var(--cj-bg);
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: var(--cj-surface);
      border-right: 1px solid var(--cj-border);
      padding: 1.1rem 0.9rem;
      gap: 1.1rem;
      z-index: 40;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.15rem 0.35rem 0.95rem;
      border-bottom: 1px solid var(--cj-border);
    }

    .brand-badge {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.12));
      border: 1px solid rgba(56, 189, 248, 0.28);
      flex-shrink: 0;
    }

    .brand-logo {
      object-fit: contain;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .brand-name {
      font-weight: 800;
      font-size: 1.05rem;
      letter-spacing: -0.025em;
      line-height: 1.2;
    }

    .brand-tagline {
      font-size: 0.75rem;
      color: var(--cj-text-muted);
      font-weight: 500;
    }

    .nav-groups {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .nav-group-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--cj-text-muted);
      padding: 0 0.7rem 0.3rem;
    }

    .nav-link {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      min-height: 40px;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      color: var(--cj-text-muted);
      font-weight: 500;
      font-size: 0.89rem;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .nav-link:hover {
      background: var(--cj-surface-hover);
      color: var(--cj-text);
      text-decoration: none;
    }

    .nav-link.active {
      background: linear-gradient(90deg, rgba(14, 165, 233, 0.16), rgba(37, 99, 235, 0.08));
      color: var(--cj-primary);
      font-weight: 600;
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 999px;
      background: linear-gradient(180deg, #0ea5e9, #2563eb);
    }

    .sidebar-footer {
      border-top: 1px solid var(--cj-border);
      padding-top: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      background: var(--cj-surface-elevated);
      border: 1px solid var(--cj-border);
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      display: grid;
      place-items: center;
      font-size: 0.78rem;
      font-weight: 800;
      color: #ffffff;
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      flex-shrink: 0;
    }

    .user-chip {
      min-width: 0;
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.85rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-email {
      font-size: 0.74rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .footer-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .btn-compact {
      min-height: 36px;
      padding: 0.35rem 0.6rem;
      font-size: 0.82rem;
    }

    .main-column {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100dvh;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      height: 60px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0 1.5rem;
      background: var(--cj-surface-glass);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--cj-border);
    }

    .topbar-tagline {
      font-size: 0.84rem;
      font-weight: 500;
      color: var(--cj-text-muted);
    }

    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      font-size: 0.98rem;
    }

    .topbar-spacer {
      flex: 1;
    }

    .role-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.12);
      color: var(--cj-primary);
      border: 1px solid rgba(14, 165, 233, 0.3);
    }

    .topbar-email {
      font-size: 0.84rem;
      font-weight: 500;
    }

    .content {
      flex: 1;
      padding: 1.75rem;
      max-width: 1360px;
      width: 100%;
      margin: 0 auto;
    }

    .offline-banner {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid rgba(245, 158, 11, 0.45);
      background: rgba(245, 158, 11, 0.12);
      color: var(--cj-warning);
      font-size: 0.88rem;
      font-weight: 600;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border-strong);
      background: var(--cj-surface);
      color: var(--cj-text);
      cursor: pointer;
    }

    .backdrop {
      display: none;
    }

    .mobile-only {
      display: none;
    }

    @media (max-width: 900px) {
      .shell {
        grid-template-columns: minmax(0, 1fr);
      }

      .mobile-only {
        display: inline-flex;
      }

      .desktop-only {
        display: none;
      }

      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(296px, 85vw);
        transform: translateX(-105%);
        transition: transform 0.2s ease;
        box-shadow: var(--cj-shadow);
      }

      .shell.drawer-open .sidebar {
        transform: translateX(0);
      }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 30;
        border: none;
        background: rgba(2, 6, 23, 0.65);
        cursor: pointer;
      }

      .topbar {
        padding: 0 0.9rem;
      }

      .content {
        padding: 1.1rem 0.9rem;
      }
    }
  `,
})
export class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  protected readonly network = inject(NetworkStatusService);
  protected readonly drawerOpen = signal(false);

  protected readonly userInitials = computed(() => {
    const user = this.auth.user();
    const source = (user?.displayName || user?.email || 'CJ').trim();
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  });

  protected readonly memberItems: readonly NavItem[] = [
    { label: 'Chat IA', path: '/app/chat', icon: 'chat' },
    { label: 'Projetos e RAG', path: '/app/projects', icon: 'projects' },
    { label: 'Tarefas Remotas', path: '/app/tasks', icon: 'tasks' },
    { label: 'Dispositivos', path: '/app/devices', icon: 'devices' },
    { label: 'Meu Consumo', path: '/app/usage', icon: 'usage' },
  ];

  protected readonly adminItems: readonly NavItem[] = [
    { label: 'Usuários', path: '/admin/users', icon: 'users' },
    { label: 'Consumo Global', path: '/admin/usage', icon: 'analytics' },
  ];

  toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  logout(): void {
    this.closeDrawer();
    void this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen()) {
      this.closeDrawer();
    }
  }
}
