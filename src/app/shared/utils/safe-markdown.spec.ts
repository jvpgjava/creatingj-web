import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SafeMarkdownComponent } from '../../features/conversations/safe-markdown.component';
import { parseSafeMarkdown } from './safe-markdown';

describe('safe-markdown & XSS protection', () => {
  it('parses headings, lists, inline code and fenced code blocks', () => {
    const md = [
      '## Resumo',
      '- Use **strict** e `OnPush`',
      '```ts',
      'const x = 1;',
      '```',
    ].join('\n');

    const blocks = parseSafeMarkdown(md);
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'list', 'code']);
    const code = blocks[2];
    expect(code.kind === 'code' && code.language).toBe('ts');
  });

  it('never executes or injects raw HTML/script tags into the DOM (XSS defense)', async () => {
    await TestBed.configureTestingModule({
      imports: [SafeMarkdownComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SafeMarkdownComponent);
    fixture.componentRef.setInput(
      'content',
      'Teste <script>window.__xss=1</script> e <img src=x onerror="alert(1)"> e javascript:alert(1)',
    );
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<script>window.__xss=1</script>');
  });
});
