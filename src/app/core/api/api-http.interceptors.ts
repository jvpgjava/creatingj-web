import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../errors/notification.service';
import { normalizeApiError } from '../errors/problem-detail';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export const apiCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest =
    req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('/api/');

  if (!isApiRequest) {
    return next(req);
  }

  let headers = req.headers;
  if (!SAFE_METHODS.has(req.method.toUpperCase()) && !headers.has('X-XSRF-TOKEN')) {
    const xsrf = readCookie('XSRF-TOKEN');
    if (xsrf) {
      headers = headers.set('X-XSRF-TOKEN', xsrf);
    }
  }

  return next(req.clone({ withCredentials: true, headers }));
};

export const problemDetailInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      const normalized = normalizeApiError(err);
      if (normalized.status === 429) {
        notifications.warning(normalized.message);
      } else if (normalized.status >= 500 || normalized.status === 0) {
        notifications.error(normalized.message);
      }
      return throwError(() => err);
    }),
  );
};
