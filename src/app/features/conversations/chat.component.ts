import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { ConversationsFacade } from './conversations.facade';
import { SafeMarkdownComponent } from './safe-markdown.component';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConversationsFacade],
  imports: [FormsModule, SafeMarkdownComponent, StatusBadgeComponent, IconComponent],
  template: `
    <div class="chat-layout">
      <aside class="conv-panel cj-card" [class.mobile-open]="mobileListOpen()">
        <div class="conv-header">
          <strong>Conversas</strong>
          <button type="button" class="cj-btn cj-btn-primary btn-sm" (click)="newChat()">
            <app-icon name="plus" [size]="14" />
            <span>Nova</span>
          </button>
        </div>

        <div class="conv-list">
          @if (facade.loadingList()) {
            <p class="cj-muted pad">Carregando histórico...</p>
          } @else if (facade.conversations().length === 0) {
            <p class="cj-muted pad">Nenhuma conversa ainda.</p>
          } @else {
            @for (conv of facade.conversations(); track conv.id) {
              <button
                type="button"
                class="conv-item"
                [class.active]="facade.activeConversation()?.id === conv.id"
                (click)="openConversation(conv.id)"
              >
                <span class="conv-title">{{ conv.title }}</span>
              </button>
            }
          }
        </div>
      </aside>

      <section class="chat-stage cj-card">
        <header class="stage-header">
          <button
            type="button"
            class="cj-btn btn-sm mobile-toggle"
            (click)="mobileListOpen.set(!mobileListOpen())"
          >
            <app-icon name="menu" [size]="15" />
            <span>Conversas ({{ facade.conversations().length }})</span>
          </button>
          <div class="stage-title">
            {{ facade.activeConversation()?.title || 'Nova conversa CreatingJ' }}
          </div>
          <div class="stage-status" aria-live="polite">
            @if (facade.state() === 'streaming' || facade.state() === 'sending') {
              <app-status-badge label="Gerando..." tone="info" />
            } @else if (facade.state() === 'cancelled') {
              <app-status-badge label="Cancelado" tone="warning" />
            } @else if (facade.state() === 'failed') {
              <app-status-badge label="Erro" tone="danger" />
            }
          </div>
        </header>

        <div class="messages-scroll">
          @if (facade.loadingHistory()) {
            <div class="cj-muted center-note">Carregando mensagens...</div>
          } @else if (facade.messages().length === 0 && !facade.streamingText()) {
            <div class="welcome-state">
              <img
                src="assets/creatingj-mascot.png"
                alt="Mascote 3D CreatingJ"
                width="124"
                height="124"
                class="welcome-mascot"
              />
              <h2>Como posso ajudar no seu código hoje?</h2>
              <p class="cj-muted">Não existe limite para sua imaginação.</p>
              <div class="quick-prompts">
                @for (prompt of quickPrompts; track prompt) {
                  <button type="button" class="cj-btn quick-btn" (click)="usePrompt(prompt)">
                    {{ prompt }}
                  </button>
                }
              </div>
            </div>
          } @else {
            @for (msg of facade.messages(); track msg.id) {
              <article class="msg" [class.msg-user]="msg.role === 'USER'">
                <div class="msg-role">
                  {{ msg.role === 'USER' ? 'Você' : 'CreatingJ' }}
                </div>
                @if (msg.role === 'USER') {
                  <div class="msg-user-text">{{ msg.content }}</div>
                } @else {
                  <app-safe-markdown [content]="msg.content" />
                }
              </article>
            }

            @if (facade.streamingText()) {
              <article class="msg msg-streaming">
                <div class="msg-role">CreatingJ • escrevendo...</div>
                <app-safe-markdown [content]="facade.streamingText()" />
              </article>
            }
          }

          @if (facade.error(); as error) {
            <div class="chat-error" role="alert">{{ error }}</div>
          }
        </div>

        <form class="composer" (ngSubmit)="send()">
          <label for="chat-input" class="cj-sr-only">Mensagem para o CreatingJ</label>
          <textarea
            id="chat-input"
            class="cj-textarea composer-input"
            rows="2"
            name="draft"
            [(ngModel)]="draft"
            (keydown)="onKeydown($event)"
            placeholder="Pergunte sobre arquitetura, debug, testes ou peça um refactor... (Enter envia, Shift+Enter quebra linha)"
            [disabled]="facade.state() === 'sending' || facade.state() === 'streaming'"
          ></textarea>
          <div class="composer-actions">
            @if (facade.state() === 'sending' || facade.state() === 'streaming') {
              <button
                type="button"
                class="cj-btn cj-btn-danger"
                (click)="facade.stopGeneration(true)"
              >
                <app-icon name="stop" [size]="14" />
                <span>Parar</span>
              </button>
            } @else {
              <button
                type="submit"
                class="cj-btn cj-btn-primary"
                [disabled]="!draft.trim()"
              >
                <app-icon name="send" [size]="14" />
                <span>Enviar</span>
              </button>
            }
          </div>
        </form>
      </section>
    </div>
  `,
  styles: `
    .chat-layout {
      display: grid;
      grid-template-columns: 270px minmax(0, 1fr);
      gap: 1rem;
      height: calc(100dvh - 108px);
      min-height: 520px;
    }

    .conv-panel {
      display: flex;
      flex-direction: column;
      padding: 0.9rem;
      gap: 0.75rem;
      overflow: hidden;
    }

    .conv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .conv-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .conv-item {
      width: 100%;
      text-align: left;
      border: 1px solid transparent;
      background: transparent;
      color: var(--cj-text);
      padding: 0.6rem 0.7rem;
      border-radius: var(--cj-radius-sm);
      cursor: pointer;
      font: inherit;
      font-size: 0.88rem;
    }

    .conv-item:hover {
      background: var(--cj-surface-hover);
    }

    .conv-item.active {
      background: rgba(56, 189, 248, 0.14);
      border-color: rgba(56, 189, 248, 0.4);
      color: var(--cj-primary);
      font-weight: 600;
    }

    .conv-title {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pad {
      padding: 0.5rem;
      margin: 0;
      font-size: 0.86rem;
    }

    .chat-stage {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      min-width: 0;
    }

    .stage-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.1rem;
      border-bottom: 1px solid var(--cj-border);
      flex-wrap: wrap;
    }

    .stage-title {
      font-weight: 700;
      flex: 1;
      min-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .messages-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .welcome-state {
      margin: auto;
      text-align: center;
      max-width: 600px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }

    .welcome-mascot {
      object-fit: contain;
      filter: drop-shadow(0 10px 24px rgba(56, 189, 248, 0.35));
    }

    .welcome-state h2 {
      margin: 0.2rem 0 0;
      font-size: 1.35rem;
    }

    .quick-prompts {
      margin-top: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.55rem;
    }

    .quick-btn {
      font-size: 0.84rem;
      font-weight: 500;
    }

    .msg {
      padding: 0.9rem 1.05rem;
      border-radius: var(--cj-radius);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
      max-width: 92%;
    }

    .msg-user {
      align-self: flex-end;
      background: rgba(56, 189, 248, 0.14);
      border-color: rgba(56, 189, 248, 0.35);
    }

    .msg-streaming {
      border-color: var(--cj-primary);
    }

    .msg-role {
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--cj-text-muted);
      margin-bottom: 0.4rem;
    }

    .msg-user-text {
      white-space: pre-wrap;
    }

    .chat-error {
      padding: 0.75rem 0.95rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.12);
      color: var(--cj-danger);
      font-size: 0.88rem;
    }

    .center-note {
      margin: auto;
    }

    .composer {
      border-top: 1px solid var(--cj-border);
      padding: 0.85rem 1rem;
      display: flex;
      gap: 0.65rem;
      align-items: flex-end;
      background: var(--cj-surface);
    }

    .composer-input {
      resize: vertical;
      min-height: 46px;
      max-height: 180px;
    }

    .composer-actions {
      display: flex;
      flex-shrink: 0;
    }

    .btn-sm {
      padding: 0.4rem 0.7rem;
      font-size: 0.82rem;
      min-height: 36px;
    }

    .mobile-toggle {
      display: none;
    }

    @media (max-width: 900px) {
      .chat-layout {
        grid-template-columns: minmax(0, 1fr);
        height: calc(100dvh - 90px);
        position: relative;
      }

      .mobile-toggle {
        display: inline-flex;
      }

      .conv-panel {
        display: none;
        max-height: 240px;
      }

      .conv-panel.mobile-open {
        display: flex;
      }

      .msg {
        max-width: 100%;
      }

      .composer {
        flex-direction: column;
        align-items: stretch;
      }

      .composer-actions .cj-btn {
        width: 100%;
        min-height: 44px;
      }
    }
  `,
})
export class ChatComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(ConversationsFacade);
  protected readonly mobileListOpen = signal(false);
  protected draft = '';

  protected readonly quickPrompts = [
    'Revise a segurança de uma API REST e aponte riscos OWASP',
    'Crie testes unitários cobrindo cenários positivos e negativos',
    'Ajude a diagnosticar um bug de concorrência em produção',
  ];

  ngOnInit(): void {
    this.facade.loadConversations();
  }

  ngOnDestroy(): void {
    this.facade.stopGeneration(false);
  }

  newChat(): void {
    this.facade.startNewConversation();
    this.mobileListOpen.set(false);
  }

  openConversation(id: string): void {
    this.facade.selectConversation(id);
    this.mobileListOpen.set(false);
  }

  usePrompt(prompt: string): void {
    this.draft = prompt;
    void this.send();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  async send(): Promise<void> {
    const content = this.draft.trim();
    if (!content) {
      return;
    }
    this.draft = '';
    await this.facade.sendMessage(content);
  }
}
