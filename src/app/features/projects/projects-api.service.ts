import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProjectRequest,
  IngestKnowledgeSourceRequest,
  IngestKnowledgeSourceResponse,
  KnowledgeIndexJobsResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  KnowledgeSourcesResponse,
  ProjectResponse,
  ProjectsPageResponse,
} from '../../core/api/api-v1.models';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/projects`;

  listProjects(page = 0, size = 30): Observable<ProjectsPageResponse> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<ProjectsPageResponse>(this.baseUrl, { params });
  }

  createProject(request: CreateProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.baseUrl, request);
  }

  listSources(projectId: string): Observable<KnowledgeSourcesResponse> {
    return this.http.get<KnowledgeSourcesResponse>(
      `${this.baseUrl}/${encodeURIComponent(projectId)}/knowledge/sources`,
    );
  }

  ingestSource(
    projectId: string,
    request: IngestKnowledgeSourceRequest,
  ): Observable<IngestKnowledgeSourceResponse> {
    return this.http.post<IngestKnowledgeSourceResponse>(
      `${this.baseUrl}/${encodeURIComponent(projectId)}/knowledge/sources`,
      request,
    );
  }

  deleteSource(projectId: string, sourceId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${encodeURIComponent(projectId)}/knowledge/sources/${encodeURIComponent(sourceId)}`,
    );
  }

  listJobs(projectId: string): Observable<KnowledgeIndexJobsResponse> {
    return this.http.get<KnowledgeIndexJobsResponse>(
      `${this.baseUrl}/${encodeURIComponent(projectId)}/knowledge/jobs`,
    );
  }

  searchKnowledge(
    projectId: string,
    request: KnowledgeSearchRequest,
  ): Observable<KnowledgeSearchResponse> {
    return this.http.post<KnowledgeSearchResponse>(
      `${this.baseUrl}/${encodeURIComponent(projectId)}/knowledge/search`,
      request,
    );
  }
}
