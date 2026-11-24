import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { NotificationService } from '../errors/notification.service';
import { AuthStore, sanitizeInternalReturnUrl } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.bootstrapSession().pipe(
    map((user) => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: sanitizeInternalReturnUrl(state.url) },
      });
    }),
  );
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  return auth.bootstrapSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: sanitizeInternalReturnUrl(state.url) },
        });
      }
      if (!user.roles.includes('ADMIN')) {
        notifications.error('Acesso restrito a administradores.');
        return router.createUrlTree(['/app/chat']);
      }
      return true;
    }),
  );
};

export const guestOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.bootstrapSession().pipe(
    map((user) => (user ? router.createUrlTree(['/app/chat']) : true)),
  );
};
