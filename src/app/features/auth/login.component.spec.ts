import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('renders official 3D mascot, tagline, and validates form fields', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img.auth-mascot') as HTMLImageElement | null;
    expect(img?.getAttribute('src')).toBe('assets/creatingj-mascot.png');
    expect(compiled.textContent).toContain('Não existe limite para sua imaginação.');

    const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});
