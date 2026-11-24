import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/status/foundation-home.component').then(
        (m) => m.FoundationHomeComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
