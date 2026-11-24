import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../api/api-v1.models';

export interface NormalizedApiError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly traceId?: string;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return {
        status: 0,
        code: 'NETWORK_UNREACHABLE',
        message: 'Não foi possível conectar ao servidor CreatingJ. Verifique sua conexão.',
      };
    }

    const body = error.error as ProblemDetail | null | undefined;
    const props = body?.properties ?? {};
    const code =
      body?.errorCode ??
      (typeof props['errorCode'] === 'string' ? props['errorCode'] : undefined) ??
      `HTTP_${error.status}`;
    const traceId =
      body?.traceId ?? (typeof props['traceId'] === 'string' ? props['traceId'] : undefined);

    if (error.status === 401) {
      return {
        status: 401,
        code,
        traceId,
        message: body?.detail ?? 'Sua sessão expirou ou você não está autenticado.',
      };
    }

    if (error.status === 403) {
      return {
        status: 403,
        code,
        traceId,
        message: body?.detail ?? 'Você não tem permissão para executar esta operação.',
      };
    }

    if (error.status === 429) {
      return {
        status: 429,
        code,
        traceId,
        message: body?.detail ?? 'Limite de requisições atingido. Aguarde alguns instantes.',
      };
    }

    return {
      status: error.status,
      code,
      traceId,
      message: body?.detail ?? body?.title ?? 'Erro inesperado ao processar sua solicitação.',
    };
  }

  return {
    status: 500,
    code: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : 'Erro inesperado na aplicação.',
  };
}
