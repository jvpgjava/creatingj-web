import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NotificationService } from '../../core/errors/notification.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { parseSafeMarkdown } from '../../shared/utils/safe-markdown';

@Component({
  selector: 'app-safe-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="md-root">
      @for (block of blocks(); track $index) {
        @switch (block.kind) {
          @case ('heading') {
            @if (block.level === 1) {
              <h3 class="md-h1">{{ block.text }}</h3>
            } @else if (block.level === 2) {
              <h4 class="md-h2">{{ block.text }}</h4>
            } @else {
              <h5 class="md-h3">{{ block.text }}</h5>
            }
          }
          @case ('code') {
            <div class="code-box">
              <div class="code-header">
                <span class="cj-mono code-lang">{{ block.language }}</span>
                <button type="button" class="copy-btn" (click)="copyCode(block.code)">
                  <app-icon name="copy" [size]="13" />
                  <span>Copiar</span>
                </button>
              </div>
              <pre class="code-pre"><code>{{ block.code }}</code></pre>
            </div>
          }
          @case ('list') {
            <ul class="md-list">
              @for (item of block.items; track $index) {
                <li>
                  @for (seg of item; track $index) {
                    @if (seg.kind === 'code') {
                      <code class="inline-code">{{ seg.text }}</code>
                    } @else if (seg.kind === 'bold') {
                      <strong>{{ seg.text }}</strong>
                    } @else {
                      {{ seg.text }}
                    }
                  }
                </li>
              }
            </ul>
          }
          @case ('paragraph') {
            <p class="md-p">
              @for (seg of block.segments; track $index) {
                @if (seg.kind === 'code') {
                  <code class="inline-code">{{ seg.text }}</code>
                } @else if (seg.kind === 'bold') {
                  <strong>{{ seg.text }}</strong>
                } @else {
                  {{ seg.text }}
                }
              }
            </p>
          }
        }
      }
    </div>
  `,
  styles: `
    .md-root {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      word-break: break-word;
    }

    .md-h1,
    .md-h2,
    .md-h3 {
      margin: 0.25rem 0 0;
    }

    .md-p {
      margin: 0;
      white-space: pre-wrap;
    }

    .md-list {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .inline-code {
      padding: 0.1rem 0.35rem;
      border-radius: 5px;
      background: rgba(56, 189, 248, 0.14);
      font-size: 0.86em;
    }

    .code-box {
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-code-bg);
      color: #e2e8f0;
      overflow: hidden;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.78rem;
    }

    .code-lang {
      color: #94a3b8;
    }

    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: transparent;
      color: #e2e8f0;
      border-radius: 6px;
      padding: 0.2rem 0.55rem;
      font-size: 0.76rem;
      cursor: pointer;
    }

    .copy-btn:hover {
      border-color: var(--cj-primary);
      color: var(--cj-primary);
    }

    .code-pre {
      margin: 0;
      padding: 0.85rem;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }
  `,
})
export class SafeMarkdownComponent {
  private readonly notifications = inject(NotificationService);
  readonly content = input.required<string>();
  protected readonly blocks = computed(() => parseSafeMarkdown(this.content()));

  copyCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard
        .writeText(code)
        .then(() => this.notifications.success('Código copiado!'));
    }
  }
}
