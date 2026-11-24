import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  CreateProjectRequest,
  IngestKnowledgeSourceRequest,
  KnowledgeIndexJobResponse,
  KnowledgeSearchResponse,
  KnowledgeSourceResponse,
  ProjectResponse,
} from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { ProjectsApiService } from './projects-api.service';

export function slugifyProjectName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isSensitiveSourcePath(path: string): boolean {
  const lower = path.trim().toLowerCase();
  const file = lower.split(/[\\/]/).pop() ?? lower;
  if (file === '.env.example' || file === '.env.sample') {
    return false;
  }
  return (
    file === '.env' ||
    file.startsWith('.env.') ||
    file.endsWith('.pem') ||
    file.endsWith('.key') ||
    file.endsWith('.p12') ||
    file === 'id_rsa' ||
    file === 'id_ed25519'
  );
}

@Injectable()
export class ProjectsFacade {
  private readonly api = inject(ProjectsApiService);
  private readonly notifications = inject(NotificationService);

  private readonly projectsSignal = signal<readonly ProjectResponse[]>([]);
  private readonly selectedSignal = signal<ProjectResponse | null>(null);
  private readonly sourcesSignal = signal<readonly KnowledgeSourceResponse[]>([]);
  private readonly jobsSignal = signal<readonly KnowledgeIndexJobResponse[]>([]);
  private readonly searchResultSignal = signal<KnowledgeSearchResponse | null>(null);
  private readonly loadingProjectsSignal = signal(false);
  private readonly loadingKnowledgeSignal = signal(false);
  private readonly submittingSignal = signal(false);
  private readonly searchingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly projects = this.projectsSignal.asReadonly();
  readonly selectedProject = this.selectedSignal.asReadonly();
  readonly sources = this.sourcesSignal.asReadonly();
  readonly jobs = this.jobsSignal.asReadonly();
  readonly searchResult = this.searchResultSignal.asReadonly();
  readonly loadingProjects = this.loadingProjectsSignal.asReadonly();
  readonly loadingKnowledge = this.loadingKnowledgeSignal.asReadonly();
  readonly submitting = this.submittingSignal.asReadonly();
  readonly searching = this.searchingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  loadProjects(): void {
    this.loadingProjectsSignal.set(true);
    this.errorSignal.set(null);

    this.api.listProjects(0, 50).subscribe({
      next: (page) => {
        this.projectsSignal.set(page.items);
        this.loadingProjectsSignal.set(false);
        const current = this.selectedSignal();
        if (!current && page.items.length > 0) {
          this.selectProject(page.items[0]);
        }
      },
      error: (err: unknown) => {
        this.loadingProjectsSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  selectProject(project: ProjectResponse): void {
    this.selectedSignal.set(project);
    this.searchResultSignal.set(null);
    this.loadKnowledge(project.id);
  }

  loadKnowledge(projectId: string): void {
    this.loadingKnowledgeSignal.set(true);
    this.errorSignal.set(null);

    forkJoin({
      sources: this.api.listSources(projectId),
      jobs: this.api.listJobs(projectId),
    }).subscribe({
      next: ({ sources, jobs }) => {
        this.sourcesSignal.set(sources.items);
        this.jobsSignal.set(jobs.items);
        this.loadingKnowledgeSignal.set(false);
      },
      error: (err: unknown) => {
        this.loadingKnowledgeSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  createProject(request: CreateProjectRequest, onSuccess?: () => void): void {
    this.submittingSignal.set(true);
    this.errorSignal.set(null);

    this.api.createProject(request).subscribe({
      next: (created) => {
        this.submittingSignal.set(false);
        this.projectsSignal.update((list) => [created, ...list]);
        this.selectProject(created);
        this.notifications.success(`Projeto "${created.name}" criado.`);
        onSuccess?.();
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  ingestSource(request: IngestKnowledgeSourceRequest, onSuccess?: () => void): void {
    const project = this.selectedSignal();
    if (!project) {
      return;
    }
    if (isSensitiveSourcePath(request.sourcePath)) {
      this.errorSignal.set(
        'Arquivos sensíveis (.env, chaves privadas) são bloqueados na ingestão RAG.',
      );
      return;
    }

    this.submittingSignal.set(true);
    this.errorSignal.set(null);

    this.api.ingestSource(project.id, request).subscribe({
      next: (res) => {
        this.submittingSignal.set(false);
        this.notifications.success(
          res.deduplicated
            ? `Fonte "${res.source.sourcePath}" já estava indexada sem alterações.`
            : `Fonte "${res.source.sourcePath}" indexada (${res.job.chunksIndexed} chunks).`,
        );
        this.loadKnowledge(project.id);
        onSuccess?.();
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  deleteSource(source: KnowledgeSourceResponse): void {
    const project = this.selectedSignal();
    if (!project) {
      return;
    }

    this.submittingSignal.set(true);
    this.api.deleteSource(project.id, source.id).subscribe({
      next: () => {
        this.submittingSignal.set(false);
        this.sourcesSignal.update((list) => list.filter((s) => s.id !== source.id));
        this.notifications.info(`Fonte "${source.sourcePath}" removida.`);
        this.loadKnowledge(project.id);
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.notifications.error(normalizeApiError(err).message);
      },
    });
  }

  search(query: string, topK = 6): void {
    const project = this.selectedSignal();
    if (!project || !query.trim()) {
      return;
    }

    this.searchingSignal.set(true);
    this.errorSignal.set(null);

    this.api.searchKnowledge(project.id, { query: query.trim(), topK }).subscribe({
      next: (res) => {
        this.searchResultSignal.set(res);
        this.searchingSignal.set(false);
      },
      error: (err: unknown) => {
        this.searchingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }
}
