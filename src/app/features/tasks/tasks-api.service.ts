import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateRemoteTaskRequest,
  CreateRemoteTaskResponse,
  RemoteTaskDetailResponse,
  RemoteTaskSummaryResponse,
  RemoteTasksResponse,
  ToolApprovalDecisionRequest,
  ToolApprovalDecisionResponse,
} from '../../core/api/api-v1.models';
import { SseFrame, consumeSseResponse } from '../../shared/utils/sse-client';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/tasks`;

  listTasks(limit = 30): Observable<RemoteTasksResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<RemoteTasksResponse>(this.baseUrl, { params });
  }

  createTask(request: CreateRemoteTaskRequest): Observable<CreateRemoteTaskResponse> {
    return this.http.post<CreateRemoteTaskResponse>(this.baseUrl, request);
  }

  getTaskDetail(taskId: string): Observable<RemoteTaskDetailResponse> {
    return this.http.get<RemoteTaskDetailResponse>(
      `${this.baseUrl}/${encodeURIComponent(taskId)}`,
    );
  }

  cancelTask(taskId: string): Observable<RemoteTaskSummaryResponse> {
    return this.http.post<RemoteTaskSummaryResponse>(
      `${this.baseUrl}/${encodeURIComponent(taskId)}/cancel`,
      {},
    );
  }

  decideApproval(
    taskId: string,
    approvalId: string,
    request: ToolApprovalDecisionRequest,
  ): Observable<ToolApprovalDecisionResponse> {
    return this.http.post<ToolApprovalDecisionResponse>(
      `${this.baseUrl}/${encodeURIComponent(taskId)}/approvals/${encodeURIComponent(approvalId)}/decision`,
      request,
    );
  }

  async streamTaskEvents(
    taskId: string,
    onFrame: (frame: SseFrame) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(taskId)}/events/stream`,
      {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'text/event-stream' },
        signal,
      },
    );
    if (!response.ok) {
      return;
    }
    await consumeSseResponse(response, onFrame);
  }
}
