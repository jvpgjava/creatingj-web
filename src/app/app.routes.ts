import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestOnlyGuard } from './core/auth/auth.guards';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'activate',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/activate-account.component').then(
        (m) => m.ActivateAccountComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'auth/pkce',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pkce-authorize.component').then((m) => m.PkceAuthorizeComponent),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'app/chat' },
      {
        path: 'app/chat',
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Chat IA',
          description: 'Módulo de conversas com streaming SSE será entregue na Fase F3.',
        },
      },
      {
        path: 'app/projects',
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Projetos e Base RAG',
          description: 'Gestão de projetos e conhecimento vetorial será entregue na Fase F4.',
        },
      },
      {
        path: 'app/tasks',
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Tarefas Remotas',
          description: 'Timeline SSE, diffs e aprovações remotas serão entregues na Fase F5.',
        },
      },
      {
        path: 'app/devices',
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Dispositivos',
          description: 'Pareamento e presença do creatingj-runner serão entregues na Fase F5.',
        },
      },
      {
        path: 'app/usage',
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Meu Consumo',
          description: 'Quotas e histórico de consumo serão entregues na Fase F6.',
        },
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'admin/usage',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Consumo Global',
          description: 'Visão administrativa de quotas e uso será entregue na Fase F6.',
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/status/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
        data: {
          title: 'Perfil e Sessões',
          description: 'Gestão de sessões ativas e conta será entregue na Fase F6.',
        },
      },
    ],
  },
  { path: '**', redirectTo: 'app/chat' },
];
