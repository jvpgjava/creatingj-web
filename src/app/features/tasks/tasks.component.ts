import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { BadgeTone, StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { TasksFacade } from './tasks.facade';

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TasksFacade],
  imports: [ReactiveFormsModule, DatePipe, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Tarefas Remotas</h1>
        <p class="cj-muted sub">
          Dispare tarefas para seus runners pareados, acompanhe eventos em tempo real e aprove operações sensíveis.
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="cj-btn" (click)="facade.loadInitial()">Atualizar</button>
        <button
          type="button"
          class="cj-btn cj-btn-primary"
          (click)="showCreate.set(!showCreate())"
        >
          {{ showCreate() ? 'Fechar' : '+ Nova tarefa' }}
        </button>
      </div>
    </div>

    @if (showCreate()) {
      <section class="cj-card create-card">
        <h2>Nova tarefa para o runner</h2>
        <form [formGroup]="taskForm" (ngSubmit)="submitTask()" class="task-form">
          <div class="form-grid">
            <div>
              <label for="task-device" class="cj-label">Dispositivo</label>
              <select id="task-device" formControlName="deviceId" class="cj-select">
                <option value="">Selecione um dispositivo</option>
                @for (dev of facade.devices(); track dev.id) {
                  <option [value]="dev.id">
                    {{ dev.name }} ({{ dev.online ? 'online' : 'offline' }})
                  </option>
                }
              </select>
            </div>
            <div>
              <label for="task-project" class="cj-label">Projeto</label>
              <select id="task-project" formControlName="projectId" class="cj-select">
                <option value="">Selecione um projeto</option>
                @for (proj of facade.projects(); track proj.id) {
                  <option [value]="proj.id">{{ proj.name }}</option>
                }
              </select>
            </div>
          </div>

          <div>
            <label for="task-title" class="cj-label">Título</label>
            <input
              id="task-title"
              type="text"
              formControlName="title"
              class="cj-input"
              placeholder="Ex.: Inspecionar workspace ou rodar testes"
            />
          </div>

          <div>
            <label for="task-inst" class="cj-label">Instrução</label>
            <textarea
              id="task-inst"
              rows="3"
              formControlName="instruction"
              class="cj-textarea cj-mono"
              placeholder="Ex.: workspace.info ou tests.run cargo test --workspace"
            ></textarea>
          </div>

          <button
            type="submit"
            class="cj-btn cj-btn-primary"
            [disabled]="facade.submitting() || taskForm.invalid"
          >
            {{ facade.submitting() ? 'Enviando...' : 'Criar tarefa remota' }}
          </button>
        </form>
      </section>
    }

    @if (facade.error(); as error) {
      <div class="cj-card err-box" role="alert">{{ error }}</div>
    }

    <div class="tasks-layout">
      <aside class="cj-card tasks-list-card">
        <h3>Fila recente ({{ facade.tasks().length }})</h3>
        @if (facade.loading()) {
          <p class="cj-muted">Carregando tarefas...</p>
        } @else if (facade.tasks().length === 0) {
          <p class="cj-muted">Nenhuma tarefa remota ainda.</p>
        } @else {
          <div class="task-items">
            @for (task of facade.tasks(); track task.id) {
              <button
                type="button"
                class="task-item"
                [class.active]="facade.detail()?.task?.id === task.id"
                (click)="facade.selectTask(task.id)"
              >
                <div class="task-item-top">
                  <span class="t-title">{{ task.title }}</span>
                  <app-status-badge [label]="task.status" [tone]="statusTone(task.status)" />
                </div>
                <span class="cj-muted small">{{ task.createdAt | date: 'dd/MM HH:mm' }}</span>
              </button>
            }
          </div>
        }
      </aside>

      <section class="task-detail-col">
        @if (facade.loadingDetail()) {
          <div class="cj-card cj-muted">Carregando detalhes da tarefa...</div>
        } @else if (facade.detail(); as d) {
          <article class="cj-card detail-card">
            <div class="detail-top">
              <div>
                <h2>{{ d.task.title }}</h2>
                <div class="cj-mono cj-muted small">{{ d.task.instruction }}</div>
              </div>
              <div class="detail-badges">
                <app-status-badge [label]="d.task.status" [tone]="statusTone(d.task.status)" />
                @if (facade.isActiveStatus(d.task.status)) {
                  <button
                    type="button"
                    class="cj-btn cj-btn-danger"
                    [disabled]="facade.submitting()"
                    (click)="facade.cancelTask(d.task.id)"
                  >
                    Cancelar
                  </button>
                }
              </div>
            </div>

            @if (d.task.resultSummary) {
              <div class="result-box">
                <strong>Resumo do resultado:</strong>
                <p>{{ d.task.resultSummary }}</p>
              </div>
            }
          </article>

          @if (d.approvals.length > 0) {
            <section class="cj-card approvals-card" aria-label="Aprovações pendentes">
              <h3>Aprovações de ferramentas ({{ d.approvals.length }})</h3>
              @for (ap of d.approvals; track ap.id) {
                <article class="approval-box">
                  <div class="approval-head">
                    <div>
                      <strong>{{ ap.toolName }}</strong>
                      @if (ap.targetPath) {
                        <span class="cj-mono cj-muted small"> • {{ ap.targetPath }}</span>
                      }
                    </div>
                    <app-status-badge [label]="ap.status" [tone]="statusTone(ap.status)" />
                  </div>

                  @if (ap.commandText) {
                    <pre class="code-preview">{{ ap.commandText }}</pre>
                  }
                  @if (ap.diffPreview) {
                    <pre class="code-preview">{{ ap.diffPreview }}</pre>
                  }

                  <div class="cj-muted small">
                    Válido até: {{ ap.expiresAt | date: 'dd/MM/yyyy HH:mm:ss' }}
                  </div>

                  @if (ap.status === 'PENDING') {
                    <div class="approval-actions">
                      <button
                        type="button"
                        class="cj-btn cj-btn-primary"
                        [disabled]="facade.submitting()"
                        (click)="facade.decideApproval(d.task.id, ap.id, 'APPROVE')"
                      >
                        Aprovar operação
                      </button>
                      <button
                        type="button"
                        class="cj-btn cj-btn-danger"
                        [disabled]="facade.submitting()"
                        (click)="facade.decideApproval(d.task.id, ap.id, 'REJECT')"
                      >
                        Rejeitar
                      </button>
                    </div>
                  }
                </article>
              }
            </section>
          }

          <section class="cj-card">
            <h3>Timeline de eventos ({{ d.events.length }})</h3>
            @if (d.events.length === 0) {
              <p class="cj-muted">Aguardando eventos do runner...</p>
            } @else {
              <ol class="timeline">
                @for (ev of d.events; track ev.id) {
                  <li>
                    <div class="ev-head">
                      <span class="cj-mono small">{{ ev.eventType }}</span>
                      <span class="cj-muted small">{{ ev.createdAt | date: 'HH:mm:ss' }}</span>
                    </div>
                    <div>{{ ev.message }}</div>
                  </li>
                }
              </ol>
            }
          </section>
        } @else {
          <app-empty-state
            title="Selecione uma tarefa"
            description="Acompanhe eventos em tempo real e aprove ou rejeite diffs e comandos propostos pelo runner."
            [showMascot]="true"
          />
        }
      </section>
    </div>
  `,
  styles: `
    .sub {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
    }

    .head-actions {
      display: flex;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .create-card,
    .err-box {
      margin-bottom: 1rem;
    }

    .err-box {
      border-color: var(--cj-danger);
      color: var(--cj-danger);
    }

    .task-form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
    }

    .tasks-layout {
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .task-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .task-item {
      width: 100%;
      text-align: left;
      padding: 0.7rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
      color: var(--cj-text);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .task-item.active {
      border-color: var(--cj-primary);
      background: rgba(56, 189, 248, 0.14);
    }

    .task-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .t-title {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-detail-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }

    .detail-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.85rem;
    }

    .detail-top h2,
    h3 {
      margin: 0 0 0.5rem;
    }

    .detail-badges {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .result-box {
      margin-top: 0.9rem;
      padding: 0.8rem;
      border-radius: var(--cj-radius-sm);
      background: var(--cj-surface-elevated);
      border: 1px solid var(--cj-border);
    }

    .result-box p {
      margin: 0.35rem 0 0;
      white-space: pre-wrap;
    }

    .approvals-card {
      border-color: rgba(245, 158, 11, 0.5);
    }

    .approval-box {
      padding: 0.85rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-top: 0.6rem;
    }

    .approval-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .code-preview {
      margin: 0;
      padding: 0.75rem;
      border-radius: var(--cj-radius-sm);
      background: var(--cj-code-bg);
      color: #e2e8f0;
      font-size: 0.82rem;
      overflow-x: auto;
      white-space: pre-wrap;
    }

    .approval-actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .timeline {
      margin: 0;
      padding-left: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .ev-head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .small {
      font-size: 0.82rem;
    }

    @media (max-width: 900px) {
      .tasks-layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class TasksComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  protected readonly facade = inject(TasksFacade);
  protected readonly showCreate = signal(false);

  protected readonly taskForm = this.fb.nonNullable.group({
    deviceId: ['', [Validators.required]],
    projectId: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    instruction: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    this.facade.loadInitial();
  }

  ngOnDestroy(): void {
    this.facade.stopEventStream();
  }

  submitTask(): void {
    if (this.taskForm.invalid) {
      return;
    }
    const raw = this.taskForm.getRawValue();
    this.facade.createTask(
      {
        deviceId: raw.deviceId,
        projectId: raw.projectId,
        title: raw.title.trim(),
        instruction: raw.instruction.trim(),
      },
      () => {
        this.taskForm.reset({ deviceId: '', projectId: '', title: '', instruction: '' });
        this.showCreate.set(false);
      },
    );
  }

  statusTone(status: string): BadgeTone {
    const upper = status.toUpperCase();
    if (upper === 'COMPLETED' || upper === 'APPROVED') {
      return 'success';
    }
    if (upper === 'FAILED' || upper === 'REJECTED' || upper === 'EXPIRED') {
      return 'danger';
    }
    if (upper === 'WAITING_APPROVAL' || upper === 'PENDING' || upper === 'CANCELLED') {
      return 'warning';
    }
    return 'info';
  }
}
