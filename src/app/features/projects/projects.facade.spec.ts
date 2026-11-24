import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectsFacade, isSensitiveSourcePath, slugifyProjectName } from './projects.facade';

describe('ProjectsFacade', () => {
  let facade: ProjectsFacade;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectsFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    facade = TestBed.inject(ProjectsFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('slugifies names and blocks sensitive paths before calling backend', () => {
    expect(slugifyProjectName('CreatingJ Backend API!')).toBe('creatingj-backend-api');
    expect(isSensitiveSourcePath('.env')).toBe(true);
    expect(isSensitiveSourcePath('config/prod.pem')).toBe(true);
    expect(isSensitiveSourcePath('.env.example')).toBe(false);
  });

  it('creates a project and searches RAG knowledge scoped to that project', () => {
    facade.createProject({ name: 'Demo', slug: 'demo' });

    httpMock.expectOne('/api/v1/projects').flush({
      id: 'p1',
      name: 'Demo',
      slug: 'demo',
      createdAt: '2026-11-23T00:00:00Z',
      updatedAt: '2026-11-23T00:00:00Z',
    });

    httpMock.expectOne('/api/v1/projects/p1/knowledge/sources').flush({ items: [] });
    httpMock.expectOne('/api/v1/projects/p1/knowledge/jobs').flush({ items: [] });

    facade.ingestSource({
      sourcePath: '.env',
      title: 'Secrets',
      content: 'CRJ_API_KEY=nope',
    });
    expect(facade.error()).toContain('sensíveis');

    facade.search('arquitetura', 5);
    const searchReq = httpMock.expectOne('/api/v1/projects/p1/knowledge/search');
    expect(searchReq.request.method).toBe('POST');
    searchReq.flush({
      projectId: 'p1',
      embeddingVersion: 'onnx:multilingual-e5-base-q8:768',
      latencyMs: 18,
      matches: [
        {
          sourceId: 's1',
          sourcePath: 'README.md',
          title: 'README',
          chunkIndex: 0,
          excerpt: 'Hexagonal',
          score: 0.91,
          embeddingVersion: 'onnx:multilingual-e5-base-q8:768',
        },
      ],
    });

    expect(facade.searchResult()?.matches.length).toBe(1);
  });
});
