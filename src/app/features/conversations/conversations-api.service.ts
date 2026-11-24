import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConversationHistoryResponse,
  ConversationSummaryResponse,
  ConversationsPageResponse,
  CreateConversationRequest,
  GenerationSummaryResponse,
  MessageExchangeResponse,
} from '../../core/api/api-v1.models';
import { SseFrame, postSseStream } from '../../shared/utils/sse-client';

export interface SseGenerationEventPayload {
  readonly generationId: string;
  readonly status: 'STARTED' | 'DELTA' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  readonly delta?: string | null;
  readonly assistantMessageId?: string | null;
  readonly promptTokens?: number | null;
  readonly completionTokens?: number | null;
  readonly totalTokens?: number | null;
  readonly errorCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConversationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/conversations`;

  listConversations(page = 0, size = 30): Observable<ConversationsPageResponse> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<ConversationsPageResponse>(this.baseUrl, { params });
  }

  createConversation(request: CreateConversationRequest): Observable<ConversationSummaryResponse> {
    return this.http.post<ConversationSummaryResponse>(this.baseUrl, request);
  }

  getHistory(conversationId: string): Observable<ConversationHistoryResponse> {
    return this.http.get<ConversationHistoryResponse>(
      `${this.baseUrl}/${encodeURIComponent(conversationId)}`,
    );
  }

  sendMessageSync(conversationId: string, content: string): Observable<MessageExchangeResponse> {
    return this.http.post<MessageExchangeResponse>(
      `${this.baseUrl}/${encodeURIComponent(conversationId)}/messages`,
      { content },
    );
  }

  cancelGeneration(
    conversationId: string,
    generationId: string,
  ): Observable<GenerationSummaryResponse> {
    return this.http.post<GenerationSummaryResponse>(
      `${this.baseUrl}/${encodeURIComponent(conversationId)}/generations/${encodeURIComponent(generationId)}/cancel`,
      {},
    );
  }

  streamMessage(
    conversationId: string,
    content: string,
    onEvent: (payload: SseGenerationEventPayload, frame: SseFrame) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const url = `${this.baseUrl}/${encodeURIComponent(conversationId)}/messages/stream`;
    return postSseStream(
      url,
      { content },
      (frame) => {
        if (!frame.data) {
          return;
        }
        try {
          const parsed = JSON.parse(frame.data) as SseGenerationEventPayload;
          onEvent(parsed, frame);
        } catch {
          // ignore keepalive comments or non-json frames
        }
      },
      signal,
    );
  }
}
