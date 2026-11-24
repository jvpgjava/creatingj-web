import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { sanitizeInternalReturnUrl } from '../auth/auth.store';
import { isSensitiveSourcePath } from '../../features/projects/projects.facade';

describe('Web security regression checks (F7)', () => {
  it('exposes only public relative API path in environment without provider secrets', () => {
    const serialized = JSON.stringify(environment);
    expect(environment.apiBaseUrl).toBe('/api/v1');
    expect(serialized).not.toMatch(/STAC_API_KEY|CRJ_API_KEY|sk-|trystac|Bearer/i);
  });

  it('blocks open redirect payloads in returnUrl sanitizer', () => {
    const payloads = [
      'https://attacker.example/phish',
      'http://evil.local',
      '//evil.local/login',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ];
    for (const payload of payloads) {
      expect(sanitizeInternalReturnUrl(payload)).toBe('/app/chat');
    }
  });

  it('blocks sensitive credential files from RAG ingestion', () => {
    for (const path of ['.env', '.env.production', 'keys/server.pem', 'id_ed25519', 'cert.key']) {
      expect(isSensitiveSourcePath(path)).toBe(true);
    }
    expect(isSensitiveSourcePath('README.md')).toBe(false);
    expect(isSensitiveSourcePath('.env.example')).toBe(false);
  });
});
