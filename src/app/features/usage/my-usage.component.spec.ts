import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MyUsageComponent } from './my-usage.component';

describe('MyUsageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyUsageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and displays exact usage counts and quota limits', () => {
    const fixture = TestBed.createComponent(MyUsageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/usage/me').flush({
      windowStart: '2026-11-24T00:00:00Z',
      windowEnd: '2026-11-25T00:00:00Z',
      usedTokens: 1250,
      usedRequests: 5,
      remainingTokens: 9998750,
      remainingRequests: 495,
      quota: {
        userId: 'u1',
        dailyTokenLimit: 10000000,
        dailyRequestLimit: 500,
        maxConcurrentGenerations: 4,
        updatedAt: '2026-11-24T00:00:00Z',
      },
      recentRecords: [],
    });

    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('495');
    expect(text).toContain('500');
  });
});
