import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ConversationSummaryResponse,
  MessageResponse,
} from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { ConversationsApiService } from './conversations-api.service';

export type GenerationUiState =
  | 'idle'
  | 'sending'
  | 'streaming'
  | 'completed'
  | 'cancelled'
  | 'failed';

@Injectable()
export class ConversationsFacade {
  private readonly api = inject(ConversationsApiService);
  private readonly notifications = inject(NotificationService);

  private readonly conversationsSignal = signal<readonly ConversationSummaryResponse[]>([]);
  private readonly activeConversationSignal = signal<ConversationSummaryResponse | null>(null);
  private readonly messagesSignal = signal<readonly MessageResponse[]>([]);
  private readonly stateSignal = signal<GenerationUiState>('idle');
  private readonly streamingTextSignal = signal('');
  private readonly activeGenerationIdSignal = signal<string | null>(null);
  private readonly loadingListSignal = signal(false);
  private readonly loadingHistorySignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  private abortController: AbortController | null = null;

  readonly conversations = this.conversationsSignal.asReadonly();
  readonly activeConversation = this.activeConversationSignal.asReadonly();
  readonly messages = this.messagesSignal.asReadonly();
  readonly state = this.stateSignal.asReadonly();
  readonly streamingText = this.streamingTextSignal.asReadonly();
  readonly activeGenerationId = this.activeGenerationIdSignal.asReadonly();
  readonly loadingList = this.loadingListSignal.asReadonly();
  readonly loadingHistory = this.loadingHistorySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  loadConversations(): void {
    this.loadingListSignal.set(true);
    this.api.listConversations(0, 30).subscribe({
      next: (page) => {
        this.conversationsSignal.set(page.items);
        this.loadingListSignal.set(false);
      },
      error: (err: unknown) => {
        this.loadingListSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  selectConversation(conversationId: string): void {
    this.stopGeneration(false);
    this.loadingHistorySignal.set(true);
    this.errorSignal.set(null);
    this.streamingTextSignal.set('');
    this.stateSignal.set('idle');

    this.api.getHistory(conversationId).subscribe({
      next: (history) => {
        this.activeConversationSignal.set(history.conversation);
        this.messagesSignal.set(history.messages);
        this.loadingHistorySignal.set(false);
      },
      error: (err: unknown) => {
        this.loadingHistorySignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  startNewConversation(): void {
    this.stopGeneration(false);
    this.activeConversationSignal.set(null);
    this.messagesSignal.set([]);
    this.streamingTextSignal.set('');
    this.errorSignal.set(null);
    this.stateSignal.set('idle');
  }

  async sendMessage(rawContent: string): Promise<void> {
    const content = rawContent.trim();
    if (!content || this.stateSignal() === 'sending' || this.stateSignal() === 'streaming') {
      return;
    }

    this.errorSignal.set(null);
    this.stateSignal.set('sending');
    this.streamingTextSignal.set('');
    this.activeGenerationIdSignal.set(null);

    try {
      let conversation = this.activeConversationSignal();
      if (!conversation) {
        const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
        conversation = await firstValueFrom(this.api.createConversation({ title }));
        this.activeConversationSignal.set(conversation);
        this.conversationsSignal.update((list) => [conversation!, ...list]);
      }

      const optimisticUserMessage: MessageResponse = {
        id: `local-${Date.now()}`,
        role: 'USER',
        content,
        sequenceNum: this.messagesSignal().length + 1,
        createdAt: new Date().toISOString(),
      };
      this.messagesSignal.update((list) => [...list, optimisticUserMessage]);

      this.abortController = new AbortController();
      this.stateSignal.set('streaming');

      await this.api.streamMessage(
        conversation.id,
        content,
        (payload) => {
          if (payload.generationId) {
            this.activeGenerationIdSignal.set(payload.generationId);
          }
          if (payload.status === 'DELTA' && payload.delta) {
            this.streamingTextSignal.update((prev) => prev + payload.delta);
          } else if (payload.status === 'COMPLETED') {
            this.stateSignal.set('completed');
          } else if (payload.status === 'CANCELLED') {
            this.stateSignal.set('cancelled');
          } else if (payload.status === 'FAILED') {
            this.stateSignal.set('failed');
            this.errorSignal.set(
              payload.errorCode
                ? `Falha na geração (${payload.errorCode}).`
                : 'A geração falhou no servidor.',
            );
          }
        },
        this.abortController.signal,
      );

      this.abortController = null;
      await this.reconcileHistory(conversation.id);
    } catch (err: unknown) {
      this.abortController = null;
      if (err instanceof DOMException && err.name === 'AbortError') {
        this.stateSignal.set('cancelled');
        const active = this.activeConversationSignal();
        if (active) {
          await this.reconcileHistory(active.id);
        }
        return;
      }
      this.stateSignal.set('failed');
      const message = err instanceof Error ? err.message : normalizeApiError(err).message;
      this.errorSignal.set(message);
    }
  }

  stopGeneration(notifyServer = true): void {
    const conv = this.activeConversationSignal();
    const genId = this.activeGenerationIdSignal();

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (notifyServer && conv && genId) {
      this.api.cancelGeneration(conv.id, genId).subscribe({
        next: () => this.notifications.info('Geração interrompida.'),
        error: () => {
          // stream may have already completed
        },
      });
    }
  }

  private async reconcileHistory(conversationId: string): Promise<void> {
    try {
      const history = await firstValueFrom(this.api.getHistory(conversationId));
      this.activeConversationSignal.set(history.conversation);
      this.messagesSignal.set(history.messages);
      this.streamingTextSignal.set('');
      this.activeGenerationIdSignal.set(null);
      if (this.stateSignal() === 'streaming' || this.stateSignal() === 'sending') {
        this.stateSignal.set('completed');
      }
    } catch {
      // keep current messages on temporary network hiccup
    }
  }
}
