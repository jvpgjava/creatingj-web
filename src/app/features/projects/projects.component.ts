import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { KnowledgeSourceResponse } from '../../core/api/api-v1.models';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { BadgeTone, StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { ProjectsFacade, isSensitiveSourcePath, slugifyProjectName } from './projects.facade';

const MAX_UPLOAD_BYTES = 200 * 1024;

@Component({
  selector: 'app-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectsFacade],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="cj-page-header">
      <div>
        <h1 class="cj-page-title">Projetos e Base de Conhecimento (RAG)</h1>
        <p class="cj-muted sub">
          Documentos ficam isolados por projeto para recuperação semântica — nunca usados para treinar pesos de modelos.
        </p>
      </div>
      <button
        type="button"
        class="cj-btn cj-btn-primary"
        (click)="showCreateProject.set(!showCreateProject())"
      >
        {{ showCreateProject() ? 'Fechar formulário' : '+ Novo projeto' }}
      </button>
    </div>

    @if (showCreateProject()) {
      <section class="cj-card create-box">
        <h2>Criar projeto</h2>
        <form [formGroup]="projectForm" (ngSubmit)="submitProject()" class="form-grid">
          <div>
            <label for="proj-name" class="cj-label">Nome do projeto</label>
            <input
              id="proj-name"
              type="text"
              formControlName="name"
              class="cj-input"
              placeholder="CreatingJ Backend"
              (input)="syncSlug()"
            />
          </div>
          <div>
            <label for="proj-slug" class="cj-label">Slug</label>
            <input
              id="proj-slug"
              type="text"
              formControlName="slug"
              class="cj-input cj-mono"
              placeholder="creatingj-backend"
            />
          </div>
          <div class="span-2">
            <label for="proj-desc" class="cj-label">Descrição (opcional)</label>
            <input
              id="proj-desc"
              type="text"
              formControlName="description"
              class="cj-input"
              placeholder="API Spring Boot + pgvector"
            />
          </div>
          <div class="form-actions">
            <button
              type="submit"
              class="cj-btn cj-btn-primary"
              [disabled]="facade.submitting() || projectForm.invalid"
            >
              {{ facade.submitting() ? 'Criando...' : 'Criar projeto' }}
            </button>
          </div>
        </form>
      </section>
    }

    @if (facade.error(); as error) {
      <div class="cj-card err-box" role="alert">{{ error }}</div>
    }

    <div class="projects-layout">
      <aside class="cj-card project-list-card">
        <h3>Seus projetos ({{ facade.projects().length }})</h3>
        @if (facade.loadingProjects()) {
          <p class="cj-muted">Carregando projetos...</p>
        } @else if (facade.projects().length === 0) {
          <p class="cj-muted">Crie seu primeiro projeto para indexar fontes RAG.</p>
        } @else {
          <div class="proj-list">
            @for (proj of facade.projects(); track proj.id) {
              <button
                type="button"
                class="proj-item"
                [class.active]="facade.selectedProject()?.id === proj.id"
                (click)="facade.selectProject(proj)"
              >
                <span class="proj-name">{{ proj.name }}</span>
                <span class="proj-slug cj-mono cj-muted">{{ proj.slug }}</span>
              </button>
            }
          </div>
        }
      </aside>

      <section class="project-detail">
        @if (facade.selectedProject(); as selected) {
          <div class="cj-card detail-header">
            <div>
              <h2>{{ selected.name }}</h2>
              <p class="cj-muted sub">
                <span class="cj-mono">{{ selected.slug }}</span>
                @if (selected.description) {
                  • {{ selected.description }}
                }
              </p>
            </div>
            <div class="tab-bar" role="tablist">
              <button
                type="button"
                class="cj-btn"
                [class.cj-btn-primary]="activeTab() === 'sources'"
                (click)="activeTab.set('sources')"
              >
                Fontes ({{ facade.sources().length }})
              </button>
              <button
                type="button"
                class="cj-btn"
                [class.cj-btn-primary]="activeTab() === 'search'"
                (click)="activeTab.set('search')"
              >
                Busca RAG
              </button>
              <button
                type="button"
                class="cj-btn"
                [class.cj-btn-primary]="activeTab() === 'jobs'"
                (click)="activeTab.set('jobs')"
              >
                Jobs ({{ facade.jobs().length }})
              </button>
            </div>
          </div>

          @if (activeTab() === 'sources') {
            <section class="cj-card">
              <h3>Indexar nova fonte de texto / código</h3>
              <form [formGroup]="sourceForm" (ngSubmit)="submitSource()" class="source-form">
                <div class="form-grid">
                  <div>
                    <label for="src-path" class="cj-label">Caminho lógico</label>
                    <input
                      id="src-path"
                      type="text"
                      formControlName="sourcePath"
                      class="cj-input cj-mono"
                      placeholder="docs/arquitetura.md"
                    />
                  </div>
                  <div>
                    <label for="src-title" class="cj-label">Título</label>
                    <input
                      id="src-title"
                      type="text"
                      formControlName="title"
                      class="cj-input"
                      placeholder="Guia de arquitetura"
                    />
                  </div>
                </div>

                <div>
                  <label for="src-file" class="cj-label">Ou carregar arquivo local (máx. 200 KB)</label>
                  <input
                    id="src-file"
                    type="file"
                    class="cj-input"
                    accept=".md,.txt,.java,.ts,.js,.rs,.py,.go,.kt,.sql,.yml,.yaml,.json,.xml"
                    (change)="onFileSelected($event)"
                  />
                </div>

                <div>
                  <label for="src-content" class="cj-label">Conteúdo</label>
                  <textarea
                    id="src-content"
                    rows="5"
                    formControlName="content"
                    class="cj-textarea cj-mono"
                    placeholder="Cole o conteúdo do documento ou código a indexar..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  class="cj-btn cj-btn-primary"
                  [disabled]="facade.submitting() || sourceForm.invalid"
                >
                  {{ facade.submitting() ? 'Indexando...' : 'Indexar fonte no projeto' }}
                </button>
              </form>
            </section>

            <section class="cj-card">
              <h3>Fontes indexadas</h3>
              @if (facade.loadingKnowledge()) {
                <p class="cj-muted">Carregando fontes...</p>
              } @else if (facade.sources().length === 0) {
                <app-empty-state
                  title="Nenhuma fonte indexada"
                  description="Adicione documentos ou arquivos de código acima para habilitar a busca RAG neste projeto."
                />
              } @else {
                <div class="source-cards">
                  @for (src of facade.sources(); track src.id) {
                    <article class="source-row">
                      <div class="source-info">
                        <strong>{{ src.title }}</strong>
                        <div class="cj-mono cj-muted small">{{ src.sourcePath }}</div>
                        <div class="cj-muted small">
                          {{ src.chunkCount }} chunks • {{ src.embeddingVersion }}
                        </div>
                      </div>
                      <div class="source-right">
                        <app-status-badge [label]="src.status" [tone]="statusTone(src.status)" />
                        <button
                          type="button"
                          class="cj-btn cj-btn-danger"
                          [disabled]="facade.submitting()"
                          (click)="confirmDelete(src)"
                        >
                          Remover
                        </button>
                      </div>
                    </article>
                  }
                </div>
              }
            </section>
          } @else if (activeTab() === 'search') {
            <section class="cj-card">
              <h3>Consulta híbrida (pgvector + texto)</h3>
              <form class="search-bar" (ngSubmit)="runSearch()">
                <input
                  type="search"
                  class="cj-input"
                  name="searchQuery"
                  [(ngModel)]="searchQuery"
                  placeholder="Ex.: Como funciona a autenticação CSRF?"
                />
                <button
                  type="submit"
                  class="cj-btn cj-btn-primary"
                  [disabled]="facade.searching() || !searchQuery.trim()"
                >
                  {{ facade.searching() ? 'Buscando...' : 'Buscar' }}
                </button>
              </form>

              @if (facade.searchResult(); as res) {
                <p class="cj-muted small meta-line">
                  {{ res.matches.length }} trechos encontrados em {{ res.latencyMs }} ms •
                  <span class="cj-mono">{{ res.embeddingVersion }}</span>
                </p>

                @if (res.matches.length === 0) {
                  <app-empty-state
                    title="Sem correspondências"
                    description="Nenhum trecho atingiu a pontuação mínima para esta consulta."
                  />
                } @else {
                  <div class="matches-list">
                    @for (m of res.matches; track m.sourceId + '-' + m.chunkIndex) {
                      <article class="match-card">
                        <div class="match-head">
                          <span class="cj-mono">{{ m.sourcePath }} #{{ m.chunkIndex }}</span>
                          <app-status-badge
                            [label]="'Score ' + (m.score | number: '1.2-2')"
                            tone="info"
                          />
                        </div>
                        <pre class="match-excerpt">{{ m.excerpt }}</pre>
                      </article>
                    }
                  </div>
                }
              }
            </section>
          } @else {
            <section class="cj-card">
              <h3>Jobs de indexação</h3>
              @if (facade.jobs().length === 0) {
                <p class="cj-muted">Nenhum job registrado neste projeto.</p>
              } @else {
                <div class="cj-table-wrap">
                  <table class="cj-table">
                    <thead>
                      <tr>
                        <th>Fonte</th>
                        <th>Operação</th>
                        <th>Status</th>
                        <th>Chunks</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (job of facade.jobs(); track job.id) {
                        <tr>
                          <td class="cj-mono">{{ job.sourcePath }}</td>
                          <td>{{ job.operation }}</td>
                          <td>
                            <app-status-badge [label]="job.status" [tone]="statusTone(job.status)" />
                          </td>
                          <td>{{ job.chunksIndexed }}</td>
                          <td>{{ job.createdAt | date: 'dd/MM HH:mm' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>
          }
        } @else {
          <app-empty-state
            title="Selecione ou crie um projeto"
            description="Cada projeto mantém seu próprio índice vetorial RAG isolado."
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

    .create-box,
    .err-box {
      margin-bottom: 1rem;
    }

    .err-box {
      border-color: var(--cj-danger);
      color: var(--cj-danger);
    }

    .create-box h2,
    .project-list-card h3,
    .detail-header h2,
    h3 {
      margin: 0 0 0.85rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
    }

    .span-2 {
      grid-column: span 2;
    }

    .form-actions {
      display: flex;
      align-items: flex-end;
    }

    .projects-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .proj-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .proj-item {
      width: 100%;
      text-align: left;
      padding: 0.65rem 0.75rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
      color: var(--cj-text);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .proj-item.active {
      border-color: var(--cj-primary);
      background: rgba(56, 189, 248, 0.14);
    }

    .proj-name {
      font-weight: 600;
    }

    .proj-slug {
      font-size: 0.78rem;
    }

    .project-detail {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
    }

    .detail-header h2 {
      margin: 0;
    }

    .tab-bar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .source-form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .source-cards {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .source-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.85rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
    }

    .source-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .small {
      font-size: 0.82rem;
    }

    .search-bar {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .search-bar .cj-input {
      flex: 1 1 240px;
    }

    .meta-line {
      margin: 0.8rem 0;
    }

    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .match-card {
      padding: 0.85rem;
      border-radius: var(--cj-radius-sm);
      border: 1px solid var(--cj-border);
      background: var(--cj-surface-elevated);
    }

    .match-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
      font-size: 0.84rem;
    }

    .match-excerpt {
      margin: 0;
      white-space: pre-wrap;
      font-size: 0.84rem;
      overflow-x: auto;
    }

    @media (max-width: 900px) {
      .projects-layout {
        grid-template-columns: minmax(0, 1fr);
      }

      .span-2 {
        grid-column: span 1;
      }
    }
  `,
})
export class ProjectsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly facade = inject(ProjectsFacade);

  protected readonly showCreateProject = signal(false);
  protected readonly activeTab = signal<'sources' | 'search' | 'jobs'>('sources');
  protected searchQuery = '';

  protected readonly projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    description: [''],
  });

  protected readonly sourceForm = this.fb.nonNullable.group({
    sourcePath: ['', [Validators.required, Validators.minLength(2)]],
    title: ['', [Validators.required, Validators.minLength(2)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    this.facade.loadProjects();
  }

  syncSlug(): void {
    const slugControl = this.projectForm.controls.slug;
    if (!slugControl.dirty) {
      slugControl.setValue(slugifyProjectName(this.projectForm.controls.name.value));
    }
  }

  submitProject(): void {
    if (this.projectForm.invalid) {
      return;
    }
    const raw = this.projectForm.getRawValue();
    this.facade.createProject(
      {
        name: raw.name.trim(),
        slug: raw.slug.trim(),
        description: raw.description.trim() || undefined,
      },
      () => {
        this.projectForm.reset({ name: '', slug: '', description: '' });
        this.showCreateProject.set(false);
      },
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (isSensitiveSourcePath(file.name)) {
      input.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      input.value = '';
      return;
    }
    void file.text().then((text) => {
      this.sourceForm.patchValue({
        sourcePath: file.name,
        title: file.name,
        content: text,
      });
    });
  }

  submitSource(): void {
    if (this.sourceForm.invalid) {
      return;
    }
    const raw = this.sourceForm.getRawValue();
    this.facade.ingestSource(
      {
        sourcePath: raw.sourcePath.trim(),
        title: raw.title.trim(),
        content: raw.content,
      },
      () => {
        this.sourceForm.reset({ sourcePath: '', title: '', content: '' });
      },
    );
  }

  confirmDelete(src: KnowledgeSourceResponse): void {
    if (typeof window !== 'undefined' && !window.confirm(`Remover fonte "${src.sourcePath}"?`)) {
      return;
    }
    this.facade.deleteSource(src);
  }

  runSearch(): void {
    this.facade.search(this.searchQuery);
  }

  statusTone(status: string): BadgeTone {
    const upper = status.toUpperCase();
    if (upper === 'INDEXED' || upper === 'COMPLETED') {
      return 'success';
    }
    if (upper === 'FAILED') {
      return 'danger';
    }
    return 'info';
  }
}
