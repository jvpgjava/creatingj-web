import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  CreateRemoteTaskRequest,
  DeviceSummaryResponse,
  ProjectResponse,
  RemoteTaskDetailResponse,
  RemoteTaskSummaryResponse,
} from '../../core/api/api-v1.models';
import { NotificationService } from '../../core/errors/notification.service';
import { normalizeApiError } from '../../core/errors/problem-detail';
import { DevicesApiService } from '../devices/devices-api.service';
import { ProjectsApiService } from '../projects/projects-api.service';
import { TasksApiService } from './tasks-api.service';

@Injectable()
export class TasksFacade {
  private readonly tasksApi = inject(TasksApiService);
  private readonly devicesApi = inject(DevicesApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly notifications = inject(NotificationService);

  private readonly tasksSignal = signal<readonly RemoteTaskSummaryResponse[]>([]);
  private readonly detailSignal = signal<RemoteTaskDetailResponse | null>(null);
  private readonly devicesSignal = signal<readonly DeviceSummaryResponse[]>([]);
  private readonly projectsSignal = signal<readonly ProjectResponse[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly loadingDetailSignal = signal(false);
  private readonly submittingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  private streamAbort: AbortController | null = null;

  readonly tasks = this.tasksSignal.asReadonly();
  readonly detail = this.detailSignal.asReadonly();
  readonly devices = this.devicesSignal.asReadonly();
  readonly projects = this.projectsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loadingDetail = this.loadingDetailSignal.asReadonly();
  readonly submitting = this.submittingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  loadInitial(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    forkJoin({
      tasks: this.tasksApi.listTasks(30),
      devices: this.devicesApi.listDevices(),
      projects: this.projectsApi.listProjects(0, 50),
    }).subscribe({
      next: ({ tasks, devices, projects }) => {
        this.tasksSignal.set(tasks.items);
        this.devicesSignal.set(devices.items.filter((d) => d.status !== 'REVOKED'));
        this.projectsSignal.set(projects.items);
        this.loadingSignal.set(false);
      },
      error: (err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  selectTask(taskId: string): void {
    this.stopEventStream();
    this.loadingDetailSignal.set(true);
    this.errorSignal.set(null);

    this.tasksApi.getTaskDetail(taskId).subscribe({
      next: (detail) => {
        this.detailSignal.set(detail);
        this.loadingDetailSignal.set(false);
        if (this.isActiveStatus(detail.task.status)) {
          this.openEventStream(taskId);
        }
      },
      error: (err: unknown) => {
        this.loadingDetailSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  createTask(request: CreateRemoteTaskRequest, onCreated?: () => void): void {
    this.submittingSignal.set(true);
    this.errorSignal.set(null);

    const idempotencyKey =
      request.idempotencyKey ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `web-${Date.now()}`);

    this.tasksApi.createTask({ ...request, idempotencyKey }).subscribe({
      next: (res) => {
        this.submittingSignal.set(false);
        this.tasksSignal.update((list) => [
          res.task,
          ...list.filter((t) => t.id !== res.task.id),
        ]);
        if (!res.deviceOnline) {
          this.notifications.warning(
            'Tarefa enfileirada — o dispositivo está offline e a receberá ao reconectar.',
          );
        } else {
          this.notifications.success(`Tarefa "${res.task.title}" enviada ao runner.`);
        }
        this.selectTask(res.task.id);
        onCreated?.();
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.errorSignal.set(normalizeApiError(err).message);
      },
    });
  }

  cancelTask(taskId: string): void {
    this.submittingSignal.set(true);
    this.tasksApi.cancelTask(taskId).subscribe({
      next: (updated) => {
        this.submittingSignal.set(false);
        this.tasksSignal.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.notifications.info('Tarefa cancelada.');
        this.selectTask(taskId);
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.notifications.error(normalizeApiError(err).message);
      },
    });
  }

  decideApproval(taskId: string, approvalId: string, action: 'APPROVE' | 'REJECT'): void {
    this.submittingSignal.set(true);
    this.tasksApi.decideApproval(taskId, approvalId, { action }).subscribe({
      next: (res) => {
        this.submittingSignal.set(false);
        this.tasksSignal.update((list) =>
          list.map((t) => (t.id === res.task.id ? res.task : t)),
        );
        this.notifications.success(
          action === 'APPROVE' ? 'Operação aprovada.' : 'Operação rejeitada.',
        );
        this.selectTask(taskId);
      },
      error: (err: unknown) => {
        this.submittingSignal.set(false);
        this.notifications.error(normalizeApiError(err).message);
      },
    });
  }

  stopEventStream(): void {
    if (this.streamAbort) {
      this.streamAbort.abort();
      this.streamAbort = null;
    }
  }

  isActiveStatus(status: string): boolean {
    const upper = status.toUpperCase();
    return upper === 'QUEUED' || upper === 'RUNNING' || upper === 'WAITING_APPROVAL';
  }

  private openEventStream(taskId: string): void {
    this.stopEventStream();
    this.streamAbort = new AbortController();
    void this.tasksApi
      .streamTaskEvents(
        taskId,
        () => {
          this.tasksApi.getTaskDetail(taskId).subscribe({
            next: (detail) => {
              this.detailSignal.set(detail);
              this.tasksSignal.update((list) =>
                list.map((t) => (t.id === detail.task.id ? detail.task : t)),
              );
            },
          });
        },
        this.streamAbort.signal,
      )
      .catch(() => {
        // stream closed or aborted
      });
  }
}
