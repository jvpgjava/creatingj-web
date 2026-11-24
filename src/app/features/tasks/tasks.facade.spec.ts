import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TasksFacade } from './tasks.facade';

describe('TasksFacade', () => {
  let facade: TasksFacade;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TasksFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    facade = TestBed.inject(TasksFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    facade.stopEventStream();
    httpMock.verify();
  });

  it('creates a remote task with idempotency key and handles approval decision', () => {
    facade.createTask({
      deviceId: 'd1',
      projectId: 'p1',
      title: 'Run tests',
      instruction: 'tests.run cargo test',
    });

    const createReq = httpMock.expectOne('/api/v1/tasks');
    expect(createReq.request.body.idempotencyKey).toBeTruthy();
    createReq.flush({
      task: {
        id: 't1',
        projectId: 'p1',
        deviceId: 'd1',
        title: 'Run tests',
        instruction: 'tests.run cargo test',
        status: 'COMPLETED',
        createdAt: '2026-11-24T00:00:00Z',
        updatedAt: '2026-11-24T00:00:00Z',
      },
      deviceOnline: true,
      deduplicated: false,
    });

    httpMock.expectOne('/api/v1/tasks/t1').flush({
      task: {
        id: 't1',
        projectId: 'p1',
        deviceId: 'd1',
        title: 'Run tests',
        instruction: 'tests.run cargo test',
        status: 'COMPLETED',
        createdAt: '2026-11-24T00:00:00Z',
        updatedAt: '2026-11-24T00:00:00Z',
      },
      events: [],
      approvals: [],
    });

    facade.decideApproval('t1', 'ap1', 'APPROVE');
    const decisionReq = httpMock.expectOne('/api/v1/tasks/t1/approvals/ap1/decision');
    expect(decisionReq.request.body).toEqual({ action: 'APPROVE' });
    decisionReq.flush({
      task: {
        id: 't1',
        projectId: 'p1',
        deviceId: 'd1',
        title: 'Run tests',
        instruction: 'tests.run cargo test',
        status: 'COMPLETED',
        createdAt: '2026-11-24T00:00:00Z',
        updatedAt: '2026-11-24T00:01:00Z',
      },
      approval: {
        id: 'ap1',
        taskId: 't1',
        toolName: 'RUN_COMMAND',
        status: 'APPROVED',
        expiresAt: '2026-11-24T01:00:00Z',
        createdAt: '2026-11-24T00:00:00Z',
      },
    });

    httpMock.expectOne('/api/v1/tasks/t1').flush({
      task: {
        id: 't1',
        projectId: 'p1',
        deviceId: 'd1',
        title: 'Run tests',
        instruction: 'tests.run cargo test',
        status: 'COMPLETED',
        createdAt: '2026-11-24T00:00:00Z',
        updatedAt: '2026-11-24T00:01:00Z',
      },
      events: [],
      approvals: [],
    });

    expect(facade.detail()?.task.status).toBe('COMPLETED');
  });
});
