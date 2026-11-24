import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { ThemeService } from './theme.service';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
          <img
            src="assets/creatingj-mascot.png"
            alt="Mascote CreatingJ"
            width="42"
            height="42"
            class="brand-logo"
          />
          <div class="brand-copy">
            <span class="brand-name">CreatingJ</span>
            <span class="brand-tagline">Sem limites para imaginar</span>
          </div>
          <button
            type="button"
            class="icon-btn mobile-only"
            (click)="closeDrawer()"
            aria-label="Fechar menu"
          >
            ✕
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
                <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
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
                  <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
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
              <span class="nav-icon" aria-hidden="true">⚙</span>
              <span>Perfil e Sessões</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          @if (auth.user(); as user) {
            <div class="user-chip">
              <div class="user-name">{{ user.displayName || user.email }}</div>
              <div class="user-email cj-muted">{{ user.email }}</div>
            </div>
          }
          <div class="footer-actions">
            <button type="button" class="cj-btn btn-compact" (click)="theme.toggle()">
              {{ theme.mode() === 'dark' ? '☀ Claro' : '☾ Escuro' }}
            </button>
            <button type="button" class="cj-btn cj-btn-danger btn-compact" (click)="logout()">
              Sair
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
            ☰
          </button>

          <div class="topbar-brand mobile-only">
            <img src="assets/creatingj-mascot.png" alt="" width="28" height="28" />
            <span>CreatingJ</span>
          </div>

          <div class="topbar-spacer"></div>

          @if (auth.user(); as user) {
            <span class="role-pill">{{ auth.isAdmin() ? 'ADMIN' : 'MEMBRO' }}</span>
            <span class="topbar-email desktop-only cj-muted">{{ user.email }}</span>
          }
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: 264px minmax(0, 1fr);
      min-height: 100dvh;
      background: var(--cj-bg);
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: var(--cj-surface);
      border-right: 1px solid var(--cj-border);
      padding: 1rem;
      gap: 1rem;
      z-index: 40;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.25rem 0.25rem 0.75rem;
      border-bottom: 1px solid var(--cj-border);
    }

    .brand-logo {
      object-fit: contain;
      filter: drop-shadow(0 6px 14px rgba(56, 189, 248, 0.35));
      flex-shrink: 0;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .brand-name {
      font-weight: 800;
      font-size: 1.08rem;
      letter-spacing: -0.02em;
    }

    .brand-tagline {
      font-size: 0.74rem;
      color: var(--cj-primary);
    }

    .nav-groups {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-group-title {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--cj-text-muted);
      padding: 0 0.65rem 0.2rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-height: 42px;
      padding: 0.55rem 0.75rem;
      border-radius: var(--cj-radius-sm);
      color: var(--cj-text);
      font-weight: 500;
      font-size: 0.92rem;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .nav-link:hover {
      background: var(--cj-surface-hover);
      text-decoration: none;
    }

    .nav-link.active {
      background: rgba(56, 189, 248, 0.16);
      color: var(--cj-primary);
      font-weight: 700;
    }

    .nav-icon {
      width: 1.25rem;
      text-align: center;
      font-size: 1rem;
    }

    .sidebar-footer {
      border-top: 1px solid var(--cj-border);
      padding-top: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .user-chip {
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.88rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-email {
      font-size: 0.78rem;
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
      min-height: 38px;
      padding: 0.4rem 0.6rem;
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
      height: 58px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0 1.25rem;
      background: var(--cj-surface);
      border-bottom: 1px solid var(--cj-border);
    }

    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      font-size: 1rem;
    }

    .topbar-spacer {
      flex: 1;
    }

    .role-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.16);
      color: var(--cj-primary);
      border: 1px solid rgba(56, 189, 248, 0.4);
    }

    .topbar-email {
      font-size: 0.85rem;
    }

    .content {
      flex: 1;
      padding: 1.5rem;
      max-width: 1360px;
      width: 100%;
      margin: 0 auto;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
      color: var(--cj-text);
      font-size: 1.15rem;
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
        width: min(290px, 84vw);
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
        padding: 0 0.85rem;
      }

      .content {
        padding: 1rem 0.85rem;
      }
    }
  `,
})
export class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  protected readonly drawerOpen = signal(false);

  protected readonly memberItems: readonly NavItem[] = [
    { label: 'Chat IA', path: '/app/chat', icon: '✦' },
    { label: 'Projetos e RAG', path: '/app/projects', icon: '◫' },
    { label: 'Tarefas Remotas', path: '/app/tasks', icon: '⚡' },
    { label: 'Dispositivos', path: '/app/devices', icon: '⌘' },
    { label: 'Meu Consumo', path: '/app/usage', icon: '◔' },
  ];

  protected readonly adminItems: readonly NavItem[] = [
    { label: 'Usuários', path: '/admin/users', icon: '☺' },
    { label: 'Consumo Global', path: '/admin/usage', icon: '▦' },
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
