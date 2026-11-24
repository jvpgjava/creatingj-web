import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { normalizeApiError } from './problem-detail';

describe('normalizeApiError', () => {
  it('extracts RFC 9457 detail, errorCode and traceId', () => {
    const err = new HttpErrorResponse({
      status: 403,
      error: {
        status: 403,
        detail: 'Token CSRF ausente ou invalido.',
        errorCode: 'FORBIDDEN',
        traceId: 'trace-abc',
      },
    });

    const normalized = normalizeApiError(err);
    expect(normalized.status).toBe(403);
    expect(normalized.code).toBe('FORBIDDEN');
    expect(normalized.traceId).toBe('trace-abc');
    expect(normalized.message).toContain('Token CSRF');
  });

  it('handles unreachable network error (status 0)', () => {
    const err = new HttpErrorResponse({ status: 0 });
    const normalized = normalizeApiError(err);
    expect(normalized.code).toBe('NETWORK_UNREACHABLE');
  });
});
